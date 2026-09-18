import { TestBed } from '@angular/core/testing';
import { AccessToken, UserProfile } from '@spotify/web-api-ts-sdk';
import { SpotifyAuthService } from './spotify-auth.service';

describe('SpotifyAuthService', () => {
  let service: SpotifyAuthService;

  const mockProfile = {
    id: 'user123',
    display_name: 'Test User',
    images: [{ url: 'https://avatar.url', height: 300, width: 300 }],
  } as unknown as UserProfile;

  const mockToken = {
    access_token: 'valid_token',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'refresh_123',
    expires: Date.now() + 3600 * 1000,
  } as AccessToken & { expires: number };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpotifyAuthService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('handleCallback', () => {
    it('should complete and update state on successful callback', (done) => {
      spyOn(service.sdk, 'authenticate').and.returnValue(
        Promise.resolve({ authenticated: true, accessToken: mockToken }),
      );
      spyOn(service.sdk.currentUser, 'profile').and.returnValue(Promise.resolve(mockProfile));

      service.handleCallback().subscribe({
        next: () => {
          let profile: UserProfile | null = null;
          service.userProfile$.subscribe((p) => (profile = p));
          expect(profile).toEqual(mockProfile);

          let isAuth = false;
          service.isAuthenticated$.subscribe((auth) => (isAuth = auth));
          expect(isAuth).toBeTrue();

          done();
        },
        error: (err) => done.fail(err),
      });
    });

    it('should emit error when SDK response is not authenticated', (done) => {
      spyOn(service.sdk, 'authenticate').and.returnValue(
        Promise.resolve({ authenticated: false, accessToken: null as unknown as AccessToken }),
      );

      service.handleCallback().subscribe({
        next: () => done.fail('Expected error, but succeeded'),
        error: (error) => {
          expect(error.message).toContain('Spotify authentication failed');
          done();
        },
      });
    });

    it('should emit error when SDK authenticate rejects (exchange rejection)', (done) => {
      spyOn(service.sdk, 'authenticate').and.returnValue(Promise.reject(new Error('PKCE exchange error')));

      service.handleCallback().subscribe({
        next: () => done.fail('Expected error, but succeeded'),
        error: (error) => {
          expect(error.message).toContain('PKCE exchange error');
          done();
        },
      });
    });

    it('should emit error when currentUser.profile rejects (profile rejection)', (done) => {
      spyOn(service.sdk, 'authenticate').and.returnValue(
        Promise.resolve({ authenticated: true, accessToken: mockToken }),
      );
      spyOn(service.sdk.currentUser, 'profile').and.returnValue(Promise.reject(new Error('Profile fetch failed')));

      service.handleCallback().subscribe({
        next: () => done.fail('Expected error, but succeeded'),
        error: (error) => {
          expect(error.message).toContain('Profile fetch failed');
          done();
        },
      });
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token is in storage', (done) => {
      service.isAuthenticated().subscribe((isAuth) => {
        expect(isAuth).toBeFalse();
        done();
      });
    });

    it('should return true from fast path when token is valid and profile is loaded', (done) => {
      localStorage.setItem('spotify-sdk:AuthorizationCodeWithPKCEStrategy:token', JSON.stringify(mockToken));
      (service as unknown as { userProfileSubject: { next: (p: UserProfile) => void } }).userProfileSubject.next(
        mockProfile,
      );
      (service as unknown as { isAuthenticatedSubject: { next: (a: boolean) => void } }).isAuthenticatedSubject.next(
        true,
      );

      const profileSpy = spyOn(service.sdk.currentUser, 'profile');

      service.isAuthenticated().subscribe((isAuth) => {
        expect(isAuth).toBeTrue();
        expect(profileSpy).not.toHaveBeenCalled();
        done();
      });
    });

    it('should verify with SDK when token is expired and return true if refresh succeeds', (done) => {
      const expiredToken = { ...mockToken, expires: Date.now() - 5000 };
      localStorage.setItem('spotify-sdk:AuthorizationCodeWithPKCEStrategy:token', JSON.stringify(expiredToken));
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(
          new Response(JSON.stringify({ access_token: 'new_token', expires_in: 3600, refresh_token: 'new_refresh' })),
        ),
      );
      spyOn(service.sdk.currentUser, 'profile').and.returnValue(Promise.resolve(mockProfile));

      service.isAuthenticated().subscribe((isAuth) => {
        expect(isAuth).toBeTrue();
        done();
      });
    });

    it('should logout and return false when SDK returns 401/expired error', (done) => {
      const expiredToken = { ...mockToken, expires: Date.now() - 5000 };
      localStorage.setItem('spotify-sdk:AuthorizationCodeWithPKCEStrategy:token', JSON.stringify(expiredToken));
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(
          new Response(JSON.stringify({ access_token: 'new_token', expires_in: 3600, refresh_token: 'new_refresh' })),
        ),
      );
      spyOn(service.sdk.currentUser, 'profile').and.returnValue(
        Promise.reject(new Error('Bad or expired token. You should re-authenticate the user.')),
      );
      const logoutSpy = spyOn(service, 'logout').and.callThrough();

      service.isAuthenticated().subscribe((isAuth) => {
        expect(isAuth).toBeFalse();
        expect(logoutSpy).toHaveBeenCalled();
        done();
      });
    });

    it('should rethrow error and NOT logout when profile fetch encounters a transient 500/network error', (done) => {
      const expiredToken = { ...mockToken, expires: Date.now() - 5000 };
      localStorage.setItem('spotify-sdk:AuthorizationCodeWithPKCEStrategy:token', JSON.stringify(expiredToken));
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(
          new Response(JSON.stringify({ access_token: 'new_token', expires_in: 3600, refresh_token: 'new_refresh' })),
        ),
      );
      spyOn(service.sdk.currentUser, 'profile').and.returnValue(
        Promise.reject(new Error('NetworkError: Failed to fetch')),
      );
      const logoutSpy = spyOn(service, 'logout');

      service.isAuthenticated().subscribe({
        next: () => done.fail('Expected error, but succeeded'),
        error: (error) => {
          expect(error.message).toContain('NetworkError');
          expect(logoutSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('ensureValidSession', () => {
    it('should share single in-flight refresh observable across concurrent callers', (done) => {
      const expiredToken = { ...mockToken, expires: Date.now() - 5000 };
      localStorage.setItem('spotify-sdk:AuthorizationCodeWithPKCEStrategy:token', JSON.stringify(expiredToken));

      const fetchSpy = spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response(JSON.stringify({ access_token: 'refreshed_token', expires_in: 3600 }))),
      );
      const profileSpy = spyOn(service.sdk.currentUser, 'profile').and.returnValue(Promise.resolve(mockProfile));

      let completed = 0;
      const onComplete = () => {
        completed++;
        if (completed === 3) {
          expect(fetchSpy).toHaveBeenCalledTimes(1);
          expect(profileSpy).toHaveBeenCalledTimes(1);

          // Verify preserved refresh_token in storage
          const tokenKey = 'spotify-sdk:AuthorizationCodeWithPKCEStrategy:token';
          const stored = JSON.parse(localStorage.getItem(tokenKey)!);
          expect(stored.access_token).toBe('refreshed_token');
          expect(stored.refresh_token).toBe(mockToken.refresh_token);
          done();
        }
      };

      service.ensureValidSession().subscribe(onComplete);
      service.ensureValidSession().subscribe(onComplete);
      service.ensureValidSession().subscribe(onComplete);
    });
  });

  describe('logout', () => {
    it('should clear sdk session and reset subjects', () => {
      sessionStorage.setItem('spotify_auth_redirect', '/top');
      const logOutSpy = spyOn(service.sdk, 'logOut');

      service.logout();

      expect(logOutSpy).toHaveBeenCalled();
      expect(sessionStorage.getItem('spotify_auth_redirect')).toBeNull();

      let profile: UserProfile | null = mockProfile;
      service.userProfile$.subscribe((p) => (profile = p));
      expect(profile).toBeNull();
    });
  });
});
