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
  private readonly spotifyService = inject(SpotifyAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    const targetPath = this.spotifyService.getRedirectPath();

    this.route.queryParams.subscribe((params) => {
      const code: string | undefined = params['code'];
      if (code) {
        this.handleCallback(targetPath);
      } else {
        this.navigateTo(targetPath);
      }
    });
  }

  handleCallback(targetPath: string): void {
    this.spotifyService.handleCallback().subscribe({
      next: () => {
        this.loading = false;
        this.navigateTo(targetPath);
      },
      error: (error) => {
        console.error('Error handling callback:', error);
        this.navigateTo(targetPath);
      },
    });
  }

  private navigateTo(path: string): void {
    this.router.navigate([path || '/']);
  }
}
