import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AccessToken, UserProfile } from '@spotify/web-api-ts-sdk';
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
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class SpotifyAuthService {
  private readonly http = inject(HttpClient);
  private readonly localStorageService = inject(LocalStorageService);
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
  getProfile(): Observable<UserProfile> {
    return this.accessToken$.pipe(
      take(1),
      switchMap((token) => {
        if (!token) {
          return throwError(() => new Error('No access token available'));
        }
        return this.http.get<UserProfile>(
          SPOTIFY_CONSTANTS.API_ENDPOINTS.PROFILE,
          {
            headers: this.getAuthHeaders(token.access_token),
          },
        );
      }),
      catchError((error) => this.handleError('getProfile', error)),
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
    const storedToken = this.localStorageService.getItemAsObject<AccessToken>(
      SPOTIFY_CONSTANTS.STORAGE.KEY_TOKEN,
    );
    if (storedToken) {
      this.accessTokenSubject.next(storedToken);
    }
  }

  /**
   * Refreshes the access token using the refresh token
   */
  refreshToken(): Observable<AccessToken> {
    const storedToken = this.localStorageService.getItemAsObject<AccessToken>(
      SPOTIFY_CONSTANTS.STORAGE.KEY_TOKEN,
    );

    if (!storedToken || !storedToken.refresh_token) {
      return throwError(
        () => new Error('No refresh token available to refresh access token'),
      );
    }

    const payload = new URLSearchParams({
      client_id: environment.spotifyClientId,
      grant_type: 'refresh_token',
      refresh_token: storedToken.refresh_token,
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
          if (response.refresh_token) {
            storedToken.refresh_token = response.refresh_token;
            this.setTokens(storedToken);
          }
        }),
        catchError((error) => {
          console.error('Error refreshing access token:', error);
          return throwError(() => new Error('Failed to refresh access token'));
        }),
      );
  }

  /**
   * Error handler for API calls
   * @param operation Name of the operation that failed
   * @param error Error object
   */
  private handleError(
    operation: string,
    error: HttpErrorResponse,
  ): Observable<never> {
    // If token expired, we could handle token refresh here
    if (error.status === 401) {
      // You could implement token refresh logic here or call your auth service
      this.refreshToken().subscribe();
    }

    return throwError(() => new Error(`${operation} failed: ${error.message}`));
  }
}
