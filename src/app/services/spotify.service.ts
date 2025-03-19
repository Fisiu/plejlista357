import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, switchMap, take, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LambdaResponse, SpotifyProfile } from './spotify.model';

@Injectable({
  providedIn: 'root',
})
export class SpotifyService {
  private http = inject(HttpClient);
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  accessToken$ = this.accessTokenSubject.asObservable();

  // Define the scopes your app needs
  private scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-modify-public',
    'playlist-modify-private',
  ];

  constructor() {
    // Initialize the access token from localStorage
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      this.accessTokenSubject.next(storedToken);
    }
  }

  login(): void {
    const clientId = environment.spotifyClientId;
    const redirectUri = encodeURIComponent(environment.redirectUrl);
    const currentPath = window.location.pathname;
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${this.scopes}&state=${currentPath}`;

    window.location.href = authUrl;
  }

  // Handle the callback from Spotify and exchange the authorization code for an access token
  handleCallback(code: string) {
    const redirectUri = encodeURIComponent(environment.redirectUrl);
    const callbackUrl = environment.lambdaUrl;

    return this.http
      .get<LambdaResponse>(
        `${callbackUrl}?code=${code}&redirect_uri=${redirectUri}`,
      )
      .pipe(
        tap((response: LambdaResponse) => {
          this.setTokens(response);
        }),
      );
  }

  // Store tokens in localStorage and update the BehaviorSubject
  private setTokens(response: LambdaResponse) {
    localStorage.setItem('spotify_access_token', response.access_token);
    localStorage.setItem('spotify_refresh_token', response.refresh_token);
    this.accessTokenSubject.next(response.access_token);
  }

  // Get the access token from localStorage
  getAccessToken(): string | null {
    return localStorage.getItem('spotify_access_token');
  }

  // Get the refresh token from localStorage
  getRefreshToken(): string | null {
    return localStorage.getItem('spotify_refresh_token');
  }

  // Make a request to Spotify's API
  getProfile(): Observable<SpotifyProfile> {
    return this.accessToken$.pipe(
      take(1),
      switchMap((token) => {
        if (!token) {
          throw new Error('No access token available');
        }
        return this.http.get<SpotifyProfile>('https://api.spotify.com/v1/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }),
    );
  }

  // Log out the user by clearing tokens
  logout() {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    this.accessTokenSubject.next(null);
  }

  // /**
  //  * Create a new playlist
  //  */
  // createPlaylist(
  //   userId: string,
  //   name: string,
  //   description = '',
  //   isPublic = true,
  // ): Observable<object> {
  //   const headers = this.getAuthHeaders();
  //   const body = {
  //     name,
  //     description,
  //     public: isPublic,
  //   };

  //   return this.http
  //     .post(`${this.apiUrl}/users/${userId}/playlists`, body, { headers })
  //     .pipe(catchError(this.handleError));
  // }

  // /**
  //  * Add tracks to a playlist
  //  */
  // addTracksToPlaylist(
  //   playlistId: string,
  //   trackUris: string[],
  // ): Observable<object> {
  //   const headers = this.getAuthHeaders();
  //   const body = {
  //     uris: trackUris,
  //   };

  //   return this.http
  //     .post(`${this.apiUrl}/playlists/${playlistId}/tracks`, body, { headers })
  //     .pipe(catchError(this.handleError));
  // }
}
