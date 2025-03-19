import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';
import { environment } from 'src/environments/environment';
import { generateCodeChallenge, generateCodeVerifier } from './auth.utils';
import {
  SpotifyTokenResponse as SpotifyAuthResponse,
  SpotifyProfile,
} from './spotify-auth.model';

@Injectable({
  providedIn: 'root',
})
export class SpotifyAuthService {
  private readonly http = inject(HttpClient);
  private readonly accessTokenSubject = new BehaviorSubject<string | null>(
    null,
  );
  readonly accessToken$ = this.accessTokenSubject.asObservable();

  private readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'spotify_access_token',
    REFRESH_TOKEN: 'spotify_refresh_token',
    CODE_VERIFIER: 'spotify_code_verifier',
  };

  private readonly API_ENDPOINTS = {
    TOKEN: 'https://accounts.spotify.com/api/token',
    AUTHORIZE: 'https://accounts.spotify.com/authorize',
    PROFILE: 'https://api.spotify.com/v1/me',
  };

  private readonly SCOPES = [
    'user-read-private',
    'user-read-email',
    'playlist-modify-public',
    'playlist-modify-private',
  ];

  constructor() {
    this.initializeFromStorage();
  }

  /**
   * Initiates the Spotify OAuth flow
   */
  async login(): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    localStorage.setItem(this.STORAGE_KEYS.CODE_VERIFIER, codeVerifier);

    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const authUrl = this.getAuthUrl(codeChallenge);
    window.location.href = authUrl;
  }

  /**
   * Logs out the user by clearing tokens and resetting state
   */
  logout() {
    Object.values(this.STORAGE_KEYS).forEach((key) =>
      localStorage.removeItem(key),
    );
    this.accessTokenSubject.next(null);
  }

  /**
   * Handles the callback from Spotify and exchanges the authorization code for tokens
   * @param code The authorization code returned from Spotify
   * @returns An Observable of the token response
   */
  handleCallback(code: string): Observable<SpotifyAuthResponse> {
    const codeVerifier = localStorage.getItem(this.STORAGE_KEYS.CODE_VERIFIER);

    if (!codeVerifier) {
      return throwError(() => new Error('Code verifier not found'));
    }

    const payload = new URLSearchParams({
      client_id: environment.spotifyClientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: environment.redirectUrl,
      code_verifier: codeVerifier,
    });

    return this.http
      .post<SpotifyAuthResponse>(this.API_ENDPOINTS.TOKEN, payload.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      .pipe(
        tap((response: SpotifyAuthResponse) => {
          this.setTokens(response);
        }),
        catchError((error) => {
          console.error('Error exchanging code for tokens:', error);
          return throwError(
            () => new Error('Failed to exchange authorization code for tokens'),
          );
        }),
      );
  }

  /**
   * Fetches the user's Spotify profile
   * @returns An Observable of the user's profile
   */
  getProfile(): Observable<SpotifyProfile> {
    return this.accessToken$.pipe(
      take(1),
      switchMap((token) => {
        if (!token) {
          return throwError(() => new Error('No access token available'));
        }
        return this.http.get<SpotifyProfile>(this.API_ENDPOINTS.PROFILE, {
          headers: this.getAuthHeaders(token),
        });
      }),
      catchError((error) => {
        console.error('Error fetching profile:', error);
        return throwError(() => new Error('Failed to fetch Spotify profile'));
      }),
    );
  }

  /**
   * Checks if the user is currently authenticated
   * @returns An Observable that emits true if authenticated, false otherwise
   */
  isAuthenticated(): Observable<boolean> {
    return this.accessToken$.pipe(map((token) => !!token));
  }

  /**
   * Gets authentication headers with the access token
   * @param token The access token to use
   * @returns HTTP headers with authorization
   */
  private getAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  /**
   * Constructs the Spotify authorization URL
   * @param codeChallenge The PKCE code challenge
   * @returns The fully formed authorization URL
   */
  private getAuthUrl(codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: environment.spotifyClientId,
      response_type: 'code',
      redirect_uri: environment.redirectUrl,
      scope: this.SCOPES.join(' '),
      state: window.location.pathname,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    return `${this.API_ENDPOINTS.AUTHORIZE}?${params.toString()}`;
  }

  /**
   * Stores tokens in localStorage and updates the BehaviorSubject
   * @param response The token response from Spotify
   */
  private setTokens(response: SpotifyAuthResponse): void {
    localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, response.access_token);

    if (response.refresh_token) {
      localStorage.setItem(
        this.STORAGE_KEYS.REFRESH_TOKEN,
        response.refresh_token,
      );
    }

    this.accessTokenSubject.next(response.access_token);
  }

  /**
   * Initializes the service from localStorage
   */
  private initializeFromStorage(): void {
    const storedToken = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
    if (storedToken) {
      this.accessTokenSubject.next(storedToken);
    }
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
