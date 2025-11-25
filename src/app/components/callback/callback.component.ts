
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SpotifyAuthService } from 'src/app/services/spotify-auth.service';

@Component({
  selector: 'app-callback',
  imports: [],
  templateUrl: './callback.component.html',
  styleUrl: './callback.component.scss',
})
export class CallbackComponent implements OnInit {
  private spotifyService = inject(SpotifyAuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    // Extract the authorization code from the URL
    this.route.queryParams.subscribe((params) => {
      const code: string | undefined = params['code'];
      const path: string | undefined = params['state'];
      if (code) {
        this.handleCallback(code, path);
      } else {
        this.navigateTo(path);
      }
    });
  }

  // Handle the callback from Spotify
  handleCallback(code: string, state?: string) {
    this.spotifyService.handleCallback(code).subscribe({
      next: () => {
        this.loading = false;
        this.navigateTo(state); // Redirect to last visited page after handling the callback
      },
      error: (error) => {
        console.error('Error handling callback:', error);
        this.router.navigate([state]); // Redirect to home on error
      },
    });
  }

  private navigateTo(path: string | undefined): void {
    if (path) {
      this.router.navigate([path]);
    } else {
      this.router.navigate(['/']);
    }
  }
}
