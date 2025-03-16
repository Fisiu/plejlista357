import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { RippleModule } from 'primeng/ripple';
import { StyleClassModule } from 'primeng/styleclass';
import { SpotifyProfile } from 'src/app/services/spotify.model';
import { SpotifyService } from 'src/app/services/spotify.service';

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
export class HeaderComponent implements OnInit {
  private spotifyService = inject(SpotifyService);
  private route = inject(ActivatedRoute);

  isAuthenticated = false;
  profile?: SpotifyProfile;
  userName = signal('');
  avatar = signal('/assets/images/spotify-user.svg');

  ngOnInit(): void {
    // Check if the user is already logged in
    this.spotifyService.accessToken$.subscribe((token) => {
      this.isAuthenticated = !!token;
      if (this.isAuthenticated) {
        this.getProfile();
      }
    });
  }

  // Redirect the user to Spotify's authorization endpoint
  login(): void {
    this.spotifyService.login();
  }

  // Log out the user
  logout(): void {
    this.spotifyService.logout();
  }

  getProfile(): void {
    this.spotifyService.getProfile().subscribe({
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
