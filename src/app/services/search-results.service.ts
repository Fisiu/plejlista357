import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MyTrack } from './spotify-playlist.model';

@Injectable({
  providedIn: 'root',
})
export class SearchResultsService {
  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  readonly isLoading$ = this.isLoadingSubject.asObservable();

  private readonly searchResultsSubject = new BehaviorSubject<(MyTrack | null)[]>([]);
  readonly searchResults$ = this.searchResultsSubject.asObservable();

  /**
   * Sets the loading state of search results.
   * @param isLoading - The new loading state (true if loading, false otherwise).
   */
  setLoading(isLoading: boolean): void {
    this.isLoadingSubject.next(isLoading);
  }

  /**
   * Sets the search results.
   * @param results - An array of MyTrack objects or nulls representing the search results.
   */
  setSearchResults(results: (MyTrack | null)[]): void {
    this.searchResultsSubject.next(results);
  }
}
