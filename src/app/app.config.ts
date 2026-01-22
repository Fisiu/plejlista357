import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { Emerald } from './app.theme';
import { spotifyAuthInterceptor } from './services/spotify-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      withEnabledBlockingInitialNavigation(),
    ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Emerald,
        options: { darkModeSelector: '.app-dark' },
      },
    }),
    provideHttpClient(withInterceptors([spotifyAuthInterceptor])),
  ],
};
