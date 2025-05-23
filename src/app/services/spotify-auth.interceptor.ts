import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, Observable, switchMap, take, tap, throwError } from 'rxjs';
import { SpotifyAuthService } from './spotify-auth.service';

// Shared state for token refresh coordination
const isRefreshing = new BehaviorSubject<boolean>(false);
const refreshTokenSubject = new BehaviorSubject<string | undefined>(undefined);

/**
 * Intercepts HTTP requests to add Spotify authentication headers and handle token refresh.
 * @param req The outgoing HTTP request.
 * @param next The next handler in the interceptor chain.
 * @returns An Observable of the HTTP event.
 */
export const spotifyAuthInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const spotifyAuthService = inject(SpotifyAuthService);

  // Only intercept Spotify API requests
  if (!req.url.includes('api.spotify.com')) {
    return next(req);
  }

  // Get the current access token from the BehaviorSubject
  const accessToken = spotifyAuthService.getAccessToken();
  if (!accessToken) {
    return next(req); // Let the request fail naturally if no token
  }

  return next(addTokenHeader(req, accessToken)).pipe(
    catchError((error: HttpErrorResponse) =>
      error.status === 401 ? handle401Error(req, next, spotifyAuthService) : throwError(() => error),
    ),
  );
};

const addTokenHeader = (req: HttpRequest<unknown>, token: string): HttpRequest<unknown> =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  spotifyAuth: SpotifyAuthService,
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing.value) {
    isRefreshing.next(true);
    return spotifyAuth.refreshToken().pipe(
      tap(() => {
        isRefreshing.next(false);
        refreshTokenSubject.next(spotifyAuth.getAccessToken());
      }),
      switchMap(() => {
        const newToken = spotifyAuth.getAccessToken();
        if (!newToken) {
          // If no new token after refresh, logout and reject the request
          spotifyAuth.logout();
          refreshTokenSubject.next(undefined);
          return throwError(() => new Error('No access token after refresh'));
        }
        return next(addTokenHeader(request, newToken));
      }),
      catchError((err) => {
        // If refresh fails, logout and reject the request
        isRefreshing.next(false);
        refreshTokenSubject.next(undefined);
        spotifyAuth.logout();
        return throwError(() => err);
      }),
    );
  }

  return refreshTokenSubject.pipe(
    filter((token) => token !== undefined),
    take(1),
    switchMap((token) => next(addTokenHeader(request, token!))),
  );
}
