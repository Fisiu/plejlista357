import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SpotifyService } from 'src/app/services/spotify.service';

@Component({
  selector: 'app-callback',
  imports: [CommonModule],
  templateUrl: './callback.component.html',
  styleUrl: './callback.component.scss',
})
export class CallbackComponent implements OnInit {
  private spotifyService = inject(SpotifyService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    // Extract the authorization code from the URL
    this.route.queryParams.subscribe((params) => {
      const code = params['code'];
      const path = params['state'];
      if (code) {
        this.handleCallback(code, path);
      } else {
        this.router.navigate(['/']); // Redirect to home if no code is found
      }
    });
  }

  // Handle the callback from Spotify
  handleCallback(code: string, state: string) {
    this.spotifyService.handleCallback(code).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate([state]); // Redirect to last visited page after handling the callback
      },
      error: (error) => {
        console.error('Error handling callback:', error);
        this.router.navigate(['/']); // Redirect to home on error
      },
    });
  }
}
