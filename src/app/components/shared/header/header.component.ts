import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserProfile } from '@spotify/web-api-ts-sdk';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { RippleModule } from 'primeng/ripple';
import { StyleClassModule } from 'primeng/styleclass';
import { Subject, takeUntil } from 'rxjs';
import { SpotifyAuthService } from 'src/app/services/spotify-auth.service';

@Component({
  selector: 'app-header',
  imports: [ButtonModule, CommonModule, RouterModule, AvatarModule, ChipModule, StyleClassModule, RippleModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  private readonly spotifyAuthService = inject(SpotifyAuthService);
  private readonly destroy$ = new Subject<void>();

  isAuthenticated = false;
  profile?: UserProfile;
  userName = signal('');
  avatar = signal('/assets/images/spotify-user.svg');

  ngOnInit(): void {
    this.checkAuthentication();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Closes the menu by clicking on the toggler element if it is open.
   * @param togglerElement The HTMLElement of the toggler element.
   */
  closeMenu(togglerElement: HTMLElement): void {
    if (togglerElement.offsetParent !== null) {
      togglerElement.click();
    }
  }

  /**
   * Checks if the user is authenticated and fetches their profile if necessary.
   */
  private checkAuthentication(): void {
    this.spotifyAuthService
      .isAuthenticated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((authenticated) => {
        this.isAuthenticated = authenticated;

        if (authenticated) {
          this.getProfile();
        }
      });
  }

  /**
   * Redirects the user to Spotify's authorization endpoint.
   */
  login(togglerElement?: HTMLElement): void {
    this.spotifyAuthService.login();

    // Close menu if called from mobile view
    if (togglerElement) {
      this.closeMenu(togglerElement);
    }
  }

  /**
   * Logs out the user and resets the user name and profile information.
   */
  logout(togglerElement?: HTMLElement): void {
    this.spotifyAuthService.logout();

    this.userName.set('');
    this.profile = undefined;

    // Close menu if called from mobile view
    if (togglerElement) {
      this.closeMenu(togglerElement);
    }
  }

  /**
   * Fetches the user's profile from Spotify and updates the component state accordingly.
   */
  getProfile(): void {
    this.spotifyAuthService.getProfile().subscribe({
      next: (profile: UserProfile) => {
        this.profile = profile;
        this.userName.set(profile.display_name);
        const firstImage = profile.images[0];
        if (firstImage) {
          this.avatar.set(firstImage.url);
        }
      },
      error: (error) => {
        console.error('Error fetching profile:', error);
        this.logout();
      },
    });
  }
}
