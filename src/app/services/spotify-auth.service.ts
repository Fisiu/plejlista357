import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AccessToken } from '@spotify/web-api-ts-sdk';
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
import { SPOTIFY_CONSTANTS } from './../constants/spotify.constants';
import { generateCodeChallenge, generateCodeVerifier } from './auth.utils';
import { SpotifyProfile } from './spotify-auth.model';

@Injectable({
  providedIn: 'root',
})
export class SpotifyAuthService {
  private readonly http = inject(HttpClient);
  private readonly accessTokenSubject = new BehaviorSubject<AccessToken | null>(
    null,
  );
  readonly accessToken$ = this.accessTokenSubject.asObservable();

  constructor() {
    this.initializeFromStorage();
  }

  /**
   * Initiates the Spotify OAuth flow
   */
  async login(): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    localStorage.setItem(SPOTIFY_CONSTANTS.STORAGE.KEY_VERIFIER, codeVerifier);

    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const authUrl = this.getAuthUrl(codeChallenge);
    window.location.href = authUrl;
  }

  /**
   * Logs out the user by clearing tokens and resetting state
   */
  logout() {
    localStorage.removeItem(SPOTIFY_CONSTANTS.STORAGE.KEY_TOKEN);
    this.accessTokenSubject.next(null);
  }

  /**
   * Handles the callback from Spotify and exchanges the authorization code for tokens
   * @param code The authorization code returned from Spotify
   * @returns An Observable of the token response
   */
  handleCallback(code: string): Observable<AccessToken> {
    const codeVerifier = localStorage.getItem(
      SPOTIFY_CONSTANTS.STORAGE.KEY_VERIFIER,
    );

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
      .post<AccessToken>(
        SPOTIFY_CONSTANTS.API_ENDPOINTS.TOKEN,
        payload.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )
      .pipe(
        tap((response: AccessToken) => {
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
        return this.http.get<SpotifyProfile>(
          SPOTIFY_CONSTANTS.API_ENDPOINTS.PROFILE,
          {
            headers: this.getAuthHeaders(token.access_token),
          },
        );
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
      scope: SPOTIFY_CONSTANTS.SCOPES.join(' '),
      state: window.location.pathname,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    return `${SPOTIFY_CONSTANTS.API_ENDPOINTS.AUTHORIZE}?${params.toString()}`;
  }

  /**
   * Stores tokens in localStorage and updates the BehaviorSubject
   * @param response The token response from Spotify
   */
  private setTokens(response: AccessToken): void {
    console.log(JSON.stringify(response));

    localStorage.setItem(
      SPOTIFY_CONSTANTS.STORAGE.KEY_TOKEN,
      JSON.stringify(response),
    );

    this.accessTokenSubject.next(response);
  }

  /**
   * Initializes the service from localStorage
   */
  private initializeFromStorage(): void {
    const storedToken = this.getItemAsObject<AccessToken>(
      SPOTIFY_CONSTANTS.STORAGE.KEY_TOKEN,
    );
    if (storedToken) {
      this.accessTokenSubject.next(storedToken);
    }
  }

  /**
   * Retrieves an item from `localStorage` and parses it as an object of type T.
   *
   * @template T - The type of the object to parse from localStorage.
   * @param key - The key under which the item is stored in localStorage.
   * @returns The parsed object if successful, or null if the item does not exist or cannot be parsed.
   */
  getItemAsObject<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    if (item) {
      try {
        return JSON.parse(item) as T;
      } catch (error) {
        console.error(
          `Error parsing localStorage item with key "${key}":`,
          error,
        );
        return null;
      }
    }
    return null;
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
