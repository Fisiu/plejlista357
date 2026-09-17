import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, Observable, Subject, switchMap, take, throwError } from 'rxjs';
import { SpotifyAuthService } from './spotify-auth.service';

// Shared state for token refresh coordination
let isRefreshing = false;
let refreshTokenSubject = new Subject<string>();

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
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject = new Subject<string>();
    return spotifyAuth.refreshToken().pipe(
      switchMap(() => {
        const newToken = spotifyAuth.getAccessToken();
        if (!newToken) {
          // If no new token after refresh, logout and reject the request
          spotifyAuth.logout();
          return throwError(() => new Error('No access token after refresh'));
        }
        refreshTokenSubject.next(newToken);
        refreshTokenSubject.complete();
        isRefreshing = false;
        return next(addTokenHeader(request, newToken));
      }),
      catchError((err) => {
        // If refresh fails, logout and reject the request
        isRefreshing = false;
        refreshTokenSubject.error(err);
        refreshTokenSubject = new Subject<string>();
        spotifyAuth.logout();
        return throwError(() => err);
      }),
    );
  }

  return refreshTokenSubject.pipe(
    take(1),
    switchMap((token) => next(addTokenHeader(request, token))),
  );
}
