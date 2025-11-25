
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogService } from 'primeng/dynamicdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { SearchResultsService } from 'src/app/services/search-results.service';
import { DisplayTrack, MyTrack } from 'src/app/services/spotify-playlist.model';

@Component({
  selector: 'app-search-results',
  imports: [ButtonModule, ProgressSpinnerModule, TableModule, TooltipModule],
  providers: [DialogService],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
})
export class SearchResultsComponent {
  private readonly searchResultsService = inject(SearchResultsService);

  isLoading = toSignal(this.searchResultsService.isLoading$);
  searchResults = toSignal(this.searchResultsService.searchResults$);

  /**
   * Computed property that converts the raw tracks into a displayable format.
   */
  displayResults = computed(() => {
    const data: (MyTrack | null)[] | undefined = this.searchResults();
    if (!data) {
      return [];
    }
    return this.convertToDisplayTrack(data);
  });

  /**
   * Converts an array of MyTrack objects into a DisplayTrack array.
   * @param tracks - Array of MyTrack objects or null values.
   * @returns An array of DisplayTrack objects.
   */
  private convertToDisplayTrack(tracks: (MyTrack | null)[]): DisplayTrack[] {
    const validTracks = tracks
      .filter((track): track is MyTrack => !!track)
      .sort((a, b) => (b.srcPosition ?? 0) - (a.srcPosition ?? 0));

    return validTracks.map((track) => ({
      id: track?.id || '',
      spotifyId: track?.id || '',
      position: track?.srcPosition.toString() || '',
      srcArtistTitle: [track?.srcArtist, track?.srcTitle].join(' - ') || '',
      title: track?.name || '',
      artist: track?.artists.map((artist) => artist.name).join(', ') || '',
      coverUrl: track?.album.images.at(2)?.url || '',
    }));
  }
}
