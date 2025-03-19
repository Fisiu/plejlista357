import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { RippleModule } from 'primeng/ripple';
import { StyleClassModule } from 'primeng/styleclass';
import { Subject, takeUntil } from 'rxjs';
import { SpotifyProfile } from 'src/app/services/spotify-auth.model';
import { SpotifyAuthService } from 'src/app/services/spotify-auth.service';

@Component({
  selector: 'app-header',
  imports: [
    ButtonModule,
    CommonModule,
    RouterModule,
    AvatarModule,
    ChipModule,
    StyleClassModule,
    RippleModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  private readonly spotifyAuthService = inject(SpotifyAuthService);
  private readonly destroy$ = new Subject<void>();

  isAuthenticated = false;
  profile?: SpotifyProfile;
  userName = signal('');
  avatar = signal('/assets/images/spotify-user.svg');

  ngOnInit(): void {
    // Check if the user is already logged in
    this.spotifyAuthService
      .isAuthenticated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuth) => {
        this.isAuthenticated = isAuth;

        if (isAuth) {
          this.getProfile();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Redirect the user to Spotify's authorization endpoint
  login(): void {
    this.spotifyAuthService.login();
  }

  // Log out the user
  logout(): void {
    this.spotifyAuthService.logout();

    this.userName.set('');
    this.profile = undefined;
  }

  getProfile(): void {
    this.spotifyAuthService.getProfile().subscribe({
      next: (profile: SpotifyProfile) => {
        this.profile = profile;
        this.userName.set(profile.display_name);
        const firstImage = profile.images[0];
        if (firstImage) {
          this.avatar.set(firstImage);
        }
      },
    });
  }
}
