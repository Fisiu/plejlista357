import { inject, Injectable } from '@angular/core';
import { MaxInt, Page, SimplifiedPlaylist, Track } from '@spotify/web-api-ts-sdk';
import { catchError, concatMap, from, last, map, mergeMap, Observable, of, switchMap, throwError, toArray } from 'rxjs';
import { chunkArray } from '../utils/array-utils';
import { isSpotifyAuthError, SpotifyAuthService } from './spotify-auth.service';
import { ArtistTitle, MyTrack } from './spotify-playlist.model';

@Injectable({
  providedIn: 'root',
})
export class SpotifyPlaylistService {
  private readonly spotifyAuthService = inject(SpotifyAuthService);

  private get sdk() {
    return this.spotifyAuthService.sdk;
  }

  /**
   * Checks if the user is currently authenticated with Spotify.
   * @returns Observable<boolean> - true if authenticated, false otherwise.
   */
  isAuthenticated(): Observable<boolean> {
    return this.spotifyAuthService.isAuthenticated();
  }

  /**
   * Gets the user's playlists using Spotify SDK.
   * Awaits session validation/token refresh before issuing request.
   * @param limit Number of playlists to retrieve
   * @param offset Offset for pagination
   */
  getUserPlaylists(limit: MaxInt<50> = 20, offset = 0): Observable<Page<SimplifiedPlaylist>> {
    return this.spotifyAuthService.ensureValidSession().pipe(
      switchMap(() => from(this.sdk.currentUser.playlists.playlists(limit, offset))),
      catchError((error) => this.handleError('getUserPlaylists', error)),
    );
  }

  /**
   * Searches for a specific track by artist and name.
   * Awaits session validation/token refresh before issuing request.
   * @param artist Artist name
   * @param trackName Track name
   * @param position Source chart position
   * @returns Observable with the best matching track or null if not found
   */
  searchTrack(artist: string, trackName: string, position: number): Observable<MyTrack | null> {
    const query = `${artist} - ${trackName}`;

    return this.spotifyAuthService.ensureValidSession().pipe(
      switchMap(() => from(this.sdk.search(query, ['track'], undefined, 1))),
      map((results) => {
        const track = results.tracks.items[0];
        if (track) {
          return { ...track, srcPosition: position, srcArtist: artist, srcTitle: trackName };
        }
        console.error(`Track not found on Spotify: "${query}" (position: ${position})`);
        return null;
      }),
      catchError((error) => {
        if (isSpotifyAuthError(error)) {
          return this.handleError('searchTrack', error);
        }
        console.error(`Error searching for track "${query}":`, error);
        return of(null);
      }),
    );
  }

  /**
   * Searches for multiple tracks by array of artist/title pairs.
   * @param trackStrings Array of strings in format "Artist - Track"
   * @returns Observable with array of track search results
   */
  searchMultipleTracks(trackStrings: ArtistTitle[]): Observable<(MyTrack | null)[]> {
    if (!trackStrings.length) {
      return of([]);
    }

    const CONCURRENCY = 2;

    return from(trackStrings).pipe(
      mergeMap(
        (trackString) => this.searchTrack(trackString.artist, trackString.title, trackString.position),
        CONCURRENCY,
      ),
      toArray(),
    );
  }

  /**
   * Checks whether a playlist with the given name exists for the current user.
   * @param name Name of the playlist to check
   * @returns Observable<boolean> - true if playlist exists, false otherwise
   */
  checkPlaylistExists(name: string): Observable<boolean> {
    const normalizedName = name.toLowerCase().trim();
    const limit: MaxInt<50> = 50;

    const checkPlaylistPage = (offset: number): Observable<boolean> =>
      this.getUserPlaylists(limit, offset).pipe(
        switchMap((playlistPage) => {
          const exists = playlistPage.items.some((playlist) => playlist.name.toLowerCase().trim() === normalizedName);
          return exists || !playlistPage.next || playlistPage.items.length < limit
            ? of(exists)
            : checkPlaylistPage(offset + limit);
        }),
        catchError((error) => {
          console.error('Error in checkPlaylistExists:', error);
          return of(false);
        }),
      );

    return checkPlaylistPage(0);
  }

  /**
   * Adds tracks to a playlist in batches.
   * Awaits session validation/token refresh before issuing request.
   * @param playlistId Playlist ID
   * @param trackUris Array of track URIs
   */
  addTracksToPlaylist(playlistId: string, trackUris: string[]): Observable<void> {
    return this.spotifyAuthService.ensureValidSession().pipe(
      switchMap(() => from(this.sdk.playlists.addItemsToPlaylist(playlistId, trackUris))),
      map(() => void 0),
      catchError((error) => this.handleError('addTracksToPlaylist', error)),
    );
  }

  /**
   * Creates a playlist and adds the supplied tracks in batches.
   * @param name Playlist name
   * @param description Playlist description
   * @param tracks Tracks to add
   * @param isPublic Whether the playlist should be public
   * @returns Observable with the created playlist
   */
  createPlaylistWithTracks(
    name: string,
    description: string,
    tracks: Track[],
    isPublic = true,
  ): Observable<SimplifiedPlaylist> {
    const validTracks = tracks.filter((track): track is Track => !!track);
    const trackUris = validTracks.map((track) => track.uri);

    return this.spotifyAuthService.getProfile().pipe(
      switchMap((user) =>
        from(
          this.sdk.playlists.createPlaylist(user.id, {
            name,
            description,
            public: isPublic,
          }),
        ),
      ),
      switchMap((playlist) => {
        if (trackUris.length === 0) {
          return of(playlist as SimplifiedPlaylist);
        }

        const chunks = chunkArray(trackUris, 100);
        return from(chunks).pipe(
          concatMap((uris) => this.addTracksToPlaylist(playlist.id, uris)),
          last(),
          map(() => playlist as SimplifiedPlaylist),
        );
      }),
      catchError((error) => this.handleError('createPlaylistWithTracks', error)),
    );
  }

  /**
   * Deletes a playlist by unfollowing it.
   * Awaits session validation/token refresh before issuing request.
   * @param playlistId ID of the playlist to delete
   * @returns Observable that completes when the playlist is deleted
   */
  deletePlaylist(playlistId: string): Observable<void> {
    return this.spotifyAuthService.ensureValidSession().pipe(
      switchMap(() => from(this.sdk.currentUser.playlists.unfollow(playlistId))),
      map(() => void 0),
      catchError((error) => this.handleError('deletePlaylist', error)),
    );
  }

  /**
   * Error handler for API calls.
   * Clears auth state if error was caused by expired/invalid authentication.
   * @param operation Name of the operation that failed
   * @param error Error object
   */
  private handleError(operation: string, error: unknown): Observable<never> {
    if (isSpotifyAuthError(error)) {
      console.warn(`Authentication failure during ${operation}, resetting auth state.`);
      this.spotifyAuthService.logout();
    }
    const message = error instanceof Error ? error.message : String(error);
    return throwError(() => new Error(`${operation} failed: ${message}`));
  }
}
