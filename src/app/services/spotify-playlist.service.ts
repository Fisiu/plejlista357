import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AccessToken, MaxInt, Page, SimplifiedPlaylist, SpotifyApi, Track } from '@spotify/web-api-ts-sdk';
import { catchError, forkJoin, from, map, Observable, of, switchMap, throwError } from 'rxjs';
import { SPOTIFY_CONSTANTS } from '../constants/spotify.constants';
import { LocalStorageService } from './local-storage.service';
import { SpotifyAuthService } from './spotify-auth.service';
import { ArtistTitle, MyTrack } from './spotify-playlist.model';

@Injectable({
  providedIn: 'root',
})
export class SpotifyPlaylistService {
  private readonly http = inject(HttpClient);
  private readonly spotifyAuthService = inject(SpotifyAuthService);
  private readonly localStorageService = inject(LocalStorageService);

  private sdk: SpotifyApi | null = null;

  constructor() {
    this.initializeSpotifySDK();
  }

  /**
   * Get user's playlists
   * @param limit Number of playlists to retrieve
   * @param offset Offset for pagination
   */
  getUserPlaylists(limit: MaxInt<20> = 20, offset = 0): Observable<Page<SimplifiedPlaylist>> {
    this.checkSdkInitialized();
    return from(this.sdk!.currentUser.playlists.playlists(limit, offset)).pipe(
      catchError((error) => this.handleError('getUserPlaylists', error)),
    );
  }

  /**
   * Get user's playlists
   * @param limit Number of playlists to retrieve
   * @param offset Offset for pagination
   */
  getUserPlaylistsRaw(limit: MaxInt<20> = 20, offset = 0): Observable<Page<SimplifiedPlaylist>> {
    const accessToken = this.localStorageService.getItemAsObject<AccessToken>(
      SPOTIFY_CONSTANTS.STORAGE.KEY_TOKEN,
    )?.access_token;

    return this.http
      .get<Page<SimplifiedPlaylist>>('https://api.spotify.com/v1/me/playlists', {
        headers: this.spotifyAuthService.getAuthHeaders(accessToken!),
        params: new HttpParams().set('limit', limit).set('offset', offset),
      })
      .pipe(catchError((error) => this.handleError('getUserPlaylists', error)));
    // this.sdk!.currentUser.playlists.playlists(limit, offset),
    // .pipe(catchError((error) => this.handleError('getUserPlaylists', error)));
  }

  /**
   * Search for a specific track by artist and name
   * @param artist Artist name
   * @param trackName Track name
   * @returns Observable with the best matching track or null if not found
   */
  searchTrack(artist: string, trackName: string, position: number): Observable<MyTrack | null> {
    try {
      this.checkSdkInitialized();
      const query = `${artist} - ${trackName}`;

      return from(this.sdk!.search(query, ['track'], undefined, 1)).pipe(
        map((results) => {
          if (results.tracks.items.length > 0) {
            const track = results.tracks.items[0];
            return { ...track, srcPosition: position, srcArtist: artist, srcTitle: trackName };
          }
          return null;
        }),
        catchError((error) => {
          this.handleError('searchTrack', error);
          return of(null);
        }),
      );
    } catch (error) {
      this.handleError('searchTrack', error);
      return of(null);
    }
  }

  /**
   * Search for multiple tracks by array of strings in format "Artist - Track"
   * @param trackStrings Array of strings in format "Artist - Track"
   * @returns Observable with array of track search results
   */
  searchMultipleTracks(trackStrings: ArtistTitle[]): Observable<(MyTrack | null)[]> {
    if (!trackStrings.length) {
      return of([]);
    }

    const searches = trackStrings.map((trackString) =>
      this.searchTrack(trackString.artist, trackString.title, trackString.position),
    );

    return forkJoin(searches);
  }

  /**
   * Check if a playlist with the given name already exists for the current user
   * @param name Name of the playlist to check
   * @returns Observable<boolean> - true if playlist exists, false otherwise
   */
  checkPlaylistExists(name: string): Observable<boolean> {
    try {
      this.checkSdkInitialized();

      // Normalize the name for case-insensitive comparison
      const normalizedName = name.toLowerCase().trim();

      // Recursive function to check paginated playlists
      const checkPlaylistPage = (offset: number, limit: MaxInt<50> = 50): Observable<boolean> => {
        return from(this.sdk!.currentUser.playlists.playlists(limit, offset)).pipe(
          switchMap((playlistPage) => {
            // Check if playlist exists in current page
            const exists = playlistPage.items.some((playlist) => playlist.name.toLowerCase().trim() === normalizedName);

            if (exists) {
              // Found it, return true
              return of(true);
            } else if (playlistPage.next && playlistPage.items.length === limit) {
              // More pages exist, check the next page
              return checkPlaylistPage(offset + limit, limit);
            } else {
              // No more pages and no match found
              return of(false);
            }
          }),
          catchError((error) => {
            this.handleError('checkPlaylistExists', error);
            return of(false); // If there's an error, assume it doesn't exist
          }),
        );
      };

      // Start checking from the first page
      return checkPlaylistPage(0);
    } catch (error) {
      console.error('Error in checkPlaylistExists:', error);
      return of(false);
    }
  }

  /**
   * Add tracks to a playlist
   * @param playlistId Playlist ID
   * @param trackUris Array of track URIs
   */
  addTracksToPlaylist(playlistId: string, trackUris: string[]): Observable<void> {
    try {
      this.checkSdkInitialized();
      return from(this.sdk!.playlists.addItemsToPlaylist(playlistId, trackUris)).pipe(
        catchError((error) => this.handleError('addTracksToPlaylist', error)),
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Create a playlist with the given tracks
   * @param name Playlist name
   * @param description Playlist description
   * @param tracks Array of tracks to add
   * @param isPublic Whether the playlist should be public
   * @returns Observable with the created playlist
   */
  createPlaylistWithTracks(
    name: string,
    description: string,
    tracks: Track[],
    isPublic = true,
  ): Observable<SimplifiedPlaylist> {
    try {
      this.checkSdkInitialized();

      // Get track URIs
      const trackUris = tracks.map((track) => track.uri);

      return this.spotifyAuthService.getProfile().pipe(
        switchMap((user) =>
          from(
            this.sdk!.playlists.createPlaylist(user.id, {
              name,
              description,
              public: isPublic,
            }),
          ),
        ),
        switchMap((playlist) => {
          if (trackUris.length > 0) {
            return from(this.sdk!.playlists.addItemsToPlaylist(playlist.id, trackUris)).pipe(map(() => playlist));
          }
          return of(playlist);
        }),
        catchError((error) => this.handleError('createPlaylistWithTracks', error)),
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Delete a playlist
   * @param playlistId ID of the playlist to delete
   * @returns Observable that completes when the playlist is deleted
   */
  deletePlaylist(playlistId: string): Observable<void> {
    try {
      this.checkSdkInitialized();

      // The Spotify API uses "unfollowPlaylist" to delete a playlist
      // that the current user has created or is following
      return from(this.sdk!.currentUser.playlists.unfollow(playlistId)).pipe(
        map(() => void 0), // Convert the response to void
        catchError((error) => this.handleError('deletePlaylist', error)),
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Initialize the Spotify SDK with tokens from localStorage
   */
  private initializeSpotifySDK(): void {
    const token = this.localStorageService.getItemAsObject<AccessToken>(SPOTIFY_CONSTANTS.STORAGE.KEY_TOKEN);

    if (token) {
      try {
        this.sdk = SpotifyApi.withAccessToken('', token);
      } catch (error) {
        console.error('Failed to parse Spotify token from localStorage:', error);
        this.sdk = null;
      }
    }
  }

  /**
   * Check if SDK is initialized, otherwise throw error
   */
  private checkSdkInitialized(): void {
    if (!this.sdk) {
      throw new Error('Spotify SDK not initialized. Authentication required.');
    }
  }

  /**
   * Refreshes the Spotify access token.
   */
  private refreshToken(): void {
    console.log('Attempting to refresh token...');
    this.spotifyAuthService.refreshToken().subscribe({
      next: (newToken: AccessToken) => {
        console.log('Token refreshed successfully:', newToken);
        localStorage.setItem(SPOTIFY_CONSTANTS.STORAGE.KEY_TOKEN, JSON.stringify(newToken));
        this.sdk = SpotifyApi.withAccessToken('', newToken); // Re-initialize SDK with new token
      },
      error: (error) => {
        console.error('Failed to refresh token:', error);
        // Handle token refresh failure.  Likely need to re-authenticate.
        // This could involve redirecting the user to the authentication flow again.
        console.log('Token refresh failed.  Redirecting to authentication flow.');
        // Example:  this.router.navigate(['/login']);  (assuming you have a router)
      },
    });
  }

  /**
   * Error handler for API calls
   * @param operation Name of the operation that failed
   * @param error Error object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError(operation: string, error: any): Observable<never> {
    // If token expired, we could handle token refresh here
    // if (error.status === 401) {
    console.log('Authentication error. Token may have expired.');
    // You could implement token refresh logic here or call your auth service
    const token = this.localStorageService.getItemAsObject<AccessToken>(SPOTIFY_CONSTANTS.STORAGE.KEY_TOKEN);
    if (token) {
      this.refreshToken();
    } else {
      this.spotifyAuthService.login();
    }
    // }

    return throwError(() => new Error(`${operation} failed: ${error.message}`));
  }
}
