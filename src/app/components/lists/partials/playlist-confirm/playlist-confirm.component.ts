import { Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Track } from '@spotify/web-api-ts-sdk';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SearchResultsService } from 'src/app/services/search-results.service';
import { SpotifyPlaylistService } from 'src/app/services/spotify-playlist.service';

@Component({
  selector: 'app-playlist-confirm',
  imports: [ButtonModule],
  templateUrl: './playlist-confirm.component.html',
  styleUrl: './playlist-confirm.component.scss',
})
export class PlaylistConfirmComponent {
  private readonly messageService = inject(MessageService);
  private readonly ref = inject(DynamicDialogRef);
  private readonly spotifyPlaylistService = inject(SpotifyPlaylistService);
  private readonly searchResultsService = inject(SearchResultsService);
  private readonly config = inject(DynamicDialogConfig);

  searchResults = toSignal(this.searchResultsService.searchResults$);

  /**
   * Computed signal that extracts tracks from the search results.
   */
  tracks: Signal<Track[]> = computed(() => {
    return this.searchResults() as Track[];
  });

  /**
   * Creates a new playlist with the provided data and closes the dialog.
   * @param data - The data to be passed back when the dialog is closed.
   */
  onCreatePlaylist(data: object): void {
    const playlistName: string = this.config.data.chartTitle;
    const playlistDescription: string = this.config.data.chartSummary;
    const tracks: Track[] = this.tracks();
    const isPublic = true;

    this.spotifyPlaylistService.checkPlaylistExists(playlistName).subscribe({
      next: (exists: boolean) => {
        if (exists) {
          this.messageService.add({
            severity: 'error',
            summary: 'Playlist not created!',
            detail: `${playlistName} already exists.`,
          });
          this.ref.close(data);
        } else {
          this.spotifyPlaylistService
            .createPlaylistWithTracks(playlistName, playlistDescription, tracks, isPublic)
            .subscribe({
              next: (createdPlaylist) => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Playlist created!',
                  detail: `${createdPlaylist.name} has been created.`,
                });
                this.ref.close(data);
              },
              error: (err) => {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Failed to create playlist.',
                });
                console.error(`Failed to create playlist:`, err);
                this.ref.close(data);
              },
            });
        }
      },
      error: (error) => {
        console.error('Error checking if playlist exists:', error);
        this.ref.close(data);
      },
    });
  }

  /**
   * Closes the dialog without creating a playlist.
   * @param data - The data to be passed back when the dialog is closed.
   */
  onCancelDialog(data: unknown) {
    this.ref.close(data);
  }
}
