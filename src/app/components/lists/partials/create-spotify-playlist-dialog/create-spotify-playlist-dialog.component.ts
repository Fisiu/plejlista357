import { Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { finalize } from 'rxjs';
import { Chart } from 'src/app/services/radio-chart.model';
import { SearchResultsService } from 'src/app/services/search-results.service';
import { SpotifyAuthService } from 'src/app/services/spotify-auth.service';
import { ArtistTitle, DialogData, MyTrack } from 'src/app/services/spotify-playlist.model';
import { SpotifyPlaylistService } from 'src/app/services/spotify-playlist.service';
import { PlaylistConfirmComponent } from '../playlist-confirm/playlist-confirm.component';
import { PlaylistTitleComponent } from '../playlist-title/playlist-title.component';
import { SearchResultsComponent } from '../search-results/search-results.component';

@Component({
  selector: 'app-create-spotify-playlist-dialog',
  imports: [ButtonModule],
  templateUrl: './create-spotify-playlist-dialog.component.html',
  styleUrl: './create-spotify-playlist-dialog.component.scss',
  providers: [DialogService],
})
export class CreateSpotifyPlaylistDialogComponent {
  private readonly dialogService = inject(DialogService);
  private readonly spotifyPlaylistService = inject(SpotifyPlaylistService);
  private readonly spotifyAuthService = inject(SpotifyAuthService);
  private readonly searchResultsService = inject(SearchResultsService);
  private ref?: DynamicDialogRef;

  latestChart = input.required<Chart | undefined>();
  latestChartText = input.required<string[]>();

  /**
   * Handles the creation of a Spotify playlist by showing the dynamic dialog.
   */
  onSpotifyPlaylistCreate() {
    this.spotifyPlaylistService.isAuthenticated().subscribe((authenticated) => {
      if (authenticated) {
        this.showDynamicDialog();
      } else {
        // Trigger the login flow
        this.spotifyAuthService.login(); // To initiate login
      }
    });
  }

  /**
   * Shows the dynamic dialog for searching tracks and creating a playlist.
   */
  private showDynamicDialog(): void {
    this.searchResultsService.setLoading(true);
    const dialogConfig = this.createDialogConfig();

    this.ref = this.dialogService.open(SearchResultsComponent, dialogConfig);
    this.ref?.onClose.subscribe((data) => console.log(data));

    this.searchTracks();
  }

  /**
   * Creates the configuration object for the dynamic dialog.
   * @returns The configuration object with width, breakpoints, modal settings, content style, and templates.
   */
  private createDialogConfig(): DynamicDialogConfig {
    const width = '50vw';
    const breakpoints = {
      '960px': '75vw',
      '640px': '90vw',
    };

    return {
      width,
      breakpoints,
      modal: true,
      contentStyle: { overflow: 'auto' },
      data: this.createDialogData(),
      templates: {
        header: PlaylistTitleComponent,
        footer: PlaylistConfirmComponent,
      },
    };
  }

  /**
   * Creates the dialog data object based on the latest chart.
   * @returns The dialog data object containing the chart title and summary.
   */
  private createDialogData(): DialogData {
    const chart = this.latestChart();
    return {
      chartTitle: [chart?.name, chart?.no].join(' #'),
      chartSummary: [chart?.document, chart?.published_at_date].join(' | '),
    };
  }

  /**
   * Searches for tracks based on the source playlist and updates the search results.
   */
  private searchTracks(): void {
    const splitSource = this.mapSourcePlaylist(this.latestChartText().join('\n'));
    this.spotifyPlaylistService
      .searchMultipleTracks(splitSource)
      .pipe(finalize(() => this.searchResultsService.setLoading(false)))
      .subscribe({
        next: (results: (MyTrack | null)[]) => {
          this.searchResultsService.setSearchResults(results);
        },
      });
  }

  /**
   * Maps the source playlist items to ArtistTitle objects.
   * @param items - A string containing artist-title pairs separated by newline characters.
   * @returns An array of ArtistTitle objects.
   */
  private mapSourcePlaylist(items: string): ArtistTitle[] {
    return items
      .split('\n')
      .map((item) => item.split(' - ').map((part) => part.trim()))
      .filter((parts) => parts.length === 2)
      .map(([artist, title], index, array) => ({ artist, title, position: array.length - index }));
  }
}
