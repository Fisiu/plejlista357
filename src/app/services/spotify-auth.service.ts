import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AccessToken, UserProfile } from '@spotify/web-api-ts-sdk';
import { BehaviorSubject, catchError, map, Observable, switchMap, take, tap, throwError } from 'rxjs';
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
  private readonly accessTokenSubject = new BehaviorSubject<AccessToken | null>(null);
  readonly accessToken$ = this.accessTokenSubject.asObservable();
  private readonly userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  readonly userProfile$ = this.userProfileSubject.asObservable();

  constructor() {
    this.loadInitialToken();
  }

  /**
   * Retrieves the current Spotify access token.
   * @returns The access token if available, otherwise undefined.
   */
  getAccessToken(): string | undefined {
    return this.accessTokenSubject.value?.access_token;
  }

  /**
   * Initiates the Spotify OAuth 2.0 authorization flow using PKCE.
   * Redirects the user to the Spotify authorization page.
   */
  async login(): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    localStorage.setItem(SPOTIFY_CONSTANTS.STORAGE.KEY_VERIFIER, codeVerifier);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    window.location.href = this.buildAuthUrl(codeChallenge);
  }

  /**
   * Logs out the current user by clearing stored tokens and resetting authentication state.
   */
  logout() {
    localStorage.removeItem(SPOTIFY_CONSTANTS.STORAGE.KEY_TOKEN);
    localStorage.removeItem(SPOTIFY_CONSTANTS.STORAGE.KEY_VERIFIER);
    this.accessTokenSubject.next(null);
  }

  /**
   * Exchanges an authorization code for an access token after Spotify redirect.
   * @param code The authorization code received from Spotify.
   * @returns An Observable emitting the access token response.
   * @throws Error if the code verifier is missing or the token request fails.
   */
  handleCallback(code: string): Observable<AccessToken> {
    const codeVerifier = localStorage.getItem(SPOTIFY_CONSTANTS.STORAGE.KEY_VERIFIER);
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

    return this.requestToken(payload).pipe(
      tap((token) => this.storeToken(token)),
      tap(() => {
        this.getProfile().subscribe({
          next: (profile) => this.userProfileSubject.next(profile),
          error: (err) => console.error(`Failed to load profile ${err}`),
        });
      }),
      catchError((error) => this.handleError('callback', error)),
    );
  }

  /**
   * Fetches the authenticated user's Spotify profile.
   * Automatically refreshes the token if a 401 error occurs.
   * @returns An Observable emitting the user's profile data.
   * @throws Error if no access token is available or the request fails.
   */
  getProfile(): Observable<UserProfile> {
    return this.accessToken$.pipe(
      take(1),
      switchMap((token) =>
        token
          ? this.http.get<UserProfile>(SPOTIFY_CONSTANTS.API_ENDPOINTS.PROFILE, {
              headers: this.getAuthHeaders(token.access_token),
            })
          : throwError(() => new Error('No access token available')),
      ),
      catchError((error) =>
        error.status === 401
          ? this.refreshToken().pipe(switchMap(() => this.getProfile()))
          : this.handleError('getProfile', error),
      ),
    );
  }

  /**
   * Checks if the user is currently authenticated.
   * @returns An Observable emitting true if an access token exists, false otherwise.
   */
  isAuthenticated(): Observable<boolean> {
    return this.accessToken$.pipe(map((token) => !!token));
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * @returns An Observable emitting the new access token response.
   * @throws Error if no refresh token is available or the refresh fails.
   */
  refreshToken(): Observable<AccessToken> {
    const storedToken = this.getStoredToken();
    if (!storedToken?.refresh_token) {
      return throwError(() => new Error('No refresh token available'));
    }

    const payload = this.buildTokenPayload({
      grant_type: 'refresh_token',
      refresh_token: storedToken.refresh_token,
    });

    return this.requestToken(payload).pipe(
      tap((token) => this.storeToken(token)),
      catchError((error) => this.handleError('refreshToken', error)),
    );
  }

  /**
   * Builds the Spotify authorization URL for PKCE flow.
   * @param codeChallenge The PKCE code challenge.
   * @returns The fully constructed authorization URL.
   * @private
   */
  private buildAuthUrl(codeChallenge: string): string {
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
   * Constructs a token request payload.
   * @param params Additional parameters specific to the grant type.
   * @returns A URLSearchParams object with the payload.
   * @private
   */
  private buildTokenPayload(params: Record<string, string>): URLSearchParams {
    return new URLSearchParams({
      client_id: environment.spotifyClientId,
      ...params,
    });
  }

  /**
   * Sends a token request to Spotify's token endpoint.
   * @param payload The request payload.
   * @returns An Observable emitting the token response.
   * @private
   */
  private requestToken(payload: URLSearchParams): Observable<AccessToken> {
    return this.http.post<AccessToken>(SPOTIFY_CONSTANTS.API_ENDPOINTS.TOKEN, payload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  /**
   * Creates HTTP headers with the Spotify access token.
   * @param token The access token.
   * @returns HttpHeaders with Authorization set.
   * @private
   */
  getAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  /**
   * Stores a token response in local storage and updates the token subject.
   * @param token The token response to store.
   * @private
   */
  private storeToken(token: AccessToken): void {
    localStorage.setItem(SPOTIFY_CONSTANTS.STORAGE.KEY_TOKEN, JSON.stringify(token));
    this.accessTokenSubject.next(token);
  }

  /**
   * Retrieves the stored token from local storage.
   * @returns The stored AccessToken or null if not found.
   * @private
   */
  private getStoredToken(): AccessToken | null {
    return this.localStorageService.getItemAsObject<AccessToken>(SPOTIFY_CONSTANTS.STORAGE.KEY_TOKEN);
  }

  /**
   * Loads the initial token from local storage on service initialization.
   * @private
   */
  private loadInitialToken(): void {
    const storedToken = this.getStoredToken();
    if (storedToken) {
      this.accessTokenSubject.next(storedToken);
    }
  }

  /**
   * Handles errors from API calls, logging out on 400 errors.
   * @param operation The name of the operation that failed.
   * @param error The HTTP error response.
   * @returns An Observable that throws an error.
   * @private
   */
  private handleError(operation: string, error: HttpErrorResponse): Observable<never> {
    // If token expired, we could handle token refresh here
    if (error.status === 400) {
      this.logout();
    }
    return throwError(() => new Error(`${operation} failed: ${error.message}`));
  }
}
