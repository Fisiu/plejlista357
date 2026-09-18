import { Injectable } from '@angular/core';
import { AccessToken, SpotifyApi, UserProfile } from '@spotify/web-api-ts-sdk';
import {
  BehaviorSubject,
  catchError,
  finalize,
  from,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { environment } from 'src/environments/environment';
import { SPOTIFY_CONSTANTS } from '../constants/spotify.constants';

export function isSpotifyAuthError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    const status = err['status'] ?? err['statusCode'];
    if (status === 401) {
      return true;
    }
    const response = err['response'] as { status?: number } | undefined;
    if (response?.status === 401) {
      return true;
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Bad or expired token') ||
    message.includes('re-authenticate the user') ||
    message.includes('invalid_grant') ||
    message.includes('invalid_token') ||
    /\b401\b/.test(message)
  );
}

@Injectable({
  providedIn: 'root',
})
export class SpotifyAuthService {
  private static readonly SDK_TOKEN_KEY = 'spotify-sdk:AuthorizationCodeWithPKCEStrategy:token';
  private static readonly REDIRECT_STATE_KEY = 'spotify_auth_redirect';

  readonly sdk: SpotifyApi = SpotifyApi.withUserAuthorization(
    environment.spotifyClientId,
    environment.redirectUrl,
    SPOTIFY_CONSTANTS.SCOPES,
  );

  private readonly userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  readonly userProfile$ = this.userProfileSubject.asObservable();

  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private refreshInFlight$: Observable<void> | null = null;

  /**
   * Retrieves the current access token string from the cached SDK token, if available.
   */
  getAccessToken(): string | undefined {
    return this.getStoredToken()?.access_token;
  }

  /**
   * Retrieves the parsed SDK token with expiry metadata from localStorage.
   */
  private getStoredToken(): (AccessToken & { expires?: number }) | null {
    try {
      const raw = localStorage.getItem(SpotifyAuthService.SDK_TOKEN_KEY);
      return raw ? (JSON.parse(raw) as AccessToken & { expires?: number }) : null;
    } catch {
      return null;
    }
  }

  /**
   * Initiates Spotify PKCE login flow and redirects the user to the Spotify authorization page.
   */
  async login(): Promise<void> {
    sessionStorage.setItem(SpotifyAuthService.REDIRECT_STATE_KEY, window.location.pathname);
    await this.sdk.authenticate();
  }

  /**
   * Logs out the user by clearing the Spotify SDK token and resetting local state.
   */
  logout(): void {
    this.refreshInFlight$ = null;
    this.sdk.logOut();
    sessionStorage.removeItem(SpotifyAuthService.REDIRECT_STATE_KEY);
    this.userProfileSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Handles the OAuth callback after redirect from Spotify.
   * Exchanges the authorization code for tokens, caches them, and loads the user profile.
   */
  handleCallback(): Observable<void> {
    return from(this.sdk.authenticate()).pipe(
      switchMap((response) => {
        if (!response.authenticated) {
          return throwError(() => new Error('Spotify authentication failed'));
        }
        return from(this.sdk.currentUser.profile()).pipe(
          tap((profile) => {
            this.userProfileSubject.next(profile);
            this.isAuthenticatedSubject.next(true);
          }),
          map(() => void 0),
        );
      }),
    );
  }

  /**
   * Ensures that the session is valid and user profile is loaded.
   * Deduplicates concurrent profile/refresh checks.
   */
  ensureValidSession(): Observable<void> {
    const storedToken = this.getStoredToken();
    if (!storedToken) {
      if (this.isAuthenticatedSubject.value || this.userProfileSubject.value) {
        this.logout();
      }
      return throwError(() => new Error('User is not authenticated with Spotify'));
    }

    const isTokenNotExpired = typeof storedToken.expires === 'number' && storedToken.expires > Date.now() + 60_000;
    if (isTokenNotExpired && this.isAuthenticatedSubject.value && this.userProfileSubject.value) {
      return of(void 0);
    }

    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refresh$ = from(this.sdk.currentUser.profile()).pipe(
      tap((profile) => {
        this.userProfileSubject.next(profile);
        this.isAuthenticatedSubject.next(true);
      }),
      map(() => void 0),
      catchError((error: unknown) => {
        if (isSpotifyAuthError(error)) {
          console.warn('Spotify session expired or invalid, logging out:', error);
          this.logout();
        }
        return throwError(() => error);
      }),
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.refreshInFlight$ = refresh$;
    return refresh$;
  }

  /**
   * Checks if the user is authenticated.
   * Keeps cached fast path only when stored token is still valid.
   * Refreshes via SDK when token is expired or profile is missing.
   * Only logs out on actual authentication failure (401/403/invalid grant), not transient errors.
   */
  isAuthenticated(): Observable<boolean> {
    const storedToken = this.getStoredToken();
    if (!storedToken) {
      if (this.isAuthenticatedSubject.value || this.userProfileSubject.value) {
        this.logout();
      }
      return of(false);
    }

    return this.ensureValidSession().pipe(
      map(() => true),
      catchError((error: unknown) => {
        if (isSpotifyAuthError(error)) {
          return of(false);
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * Fetches the user profile from Spotify or returns the cached profile.
   */
  getProfile(): Observable<UserProfile> {
    return this.ensureValidSession().pipe(map(() => this.userProfileSubject.value!));
  }

  /**
   * Retrieves and clears the stored post-login redirect path.
   */
  getRedirectPath(): string {
    const path = sessionStorage.getItem(SpotifyAuthService.REDIRECT_STATE_KEY);
    sessionStorage.removeItem(SpotifyAuthService.REDIRECT_STATE_KEY);
    return path || '/';
  }
}
