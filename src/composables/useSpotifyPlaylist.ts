import { onScopeDispose, ref, shallowRef } from "vue";

import {
  addSpotifyPlaylistTracks,
  createSpotifyPlaylist,
  getSpotifyUserProfile,
  searchSpotifyTracks,
  type SpotifyPlaylistSummary,
} from "@/api/spotify";
import { SpotifyApiError } from "@/api/spotifyErrors";
import type { ChartItem } from "@/types/radioChart";
import type { ChartTrackMatch, SpotifyTrack } from "@/types/spotify";

const searchConcurrency = 2;
const playlistBatchSize = 100;

function createMissingMatch(item: ChartItem): ChartTrackMatch {
  return {
    chartItemId: item.id,
    position: item.position,
    artist: item.artist,
    title: item.name,
    status: "missing",
    confidence: "missing",
    candidates: [],
  };
}

function createTrackMatch(item: ChartItem, track?: SpotifyTrack): ChartTrackMatch {
  if (!track) return createMissingMatch(item);

  return {
    chartItemId: item.id,
    position: item.position,
    artist: item.artist,
    title: item.name,
    status: "matched",
    confidence: "probable",
    selectedUri: track.uri,
    candidates: [track],
  };
}

export function useSpotifyPlaylist() {
  const matches = shallowRef<ChartTrackMatch[]>([]);
  const completedSearches = ref(0);
  const totalSearches = ref(0);
  const isSearching = ref(false);
  const isCreating = ref(false);
  const addedTrackCount = ref(0);
  const totalTrackCount = ref(0);
  const createdPlaylist = shallowRef<SpotifyPlaylistSummary>();
  const creationComplete = ref(false);
  const manualSearchResults = shallowRef<Record<number, SpotifyTrack[]>>({});
  const manualSearchErrors = ref<Record<number, string>>({});
  const manualSearchErrorStatuses = ref<Record<number, number>>({});
  const manualSearchingIds = ref(new Set<number>());
  let activeController: AbortController | undefined;
  let currentRequestId = 0;
  let creationRequestId = 0;
  const manualSearchRequestIds = new Map<number, number>();

  async function matchChart(items: readonly ChartItem[]): Promise<void> {
    activeController?.abort();
    creationRequestId += 1;
    isCreating.value = false;
    createdPlaylist.value = undefined;
    creationComplete.value = false;
    const controller = new AbortController();
    activeController = controller;
    const requestId = ++currentRequestId;
    const searchItems = [...items];
    const orderedItems = searchItems;
    const results = new Map<number, ChartTrackMatch>();

    completedSearches.value = 0;
    totalSearches.value = orderedItems.length;
    isSearching.value = orderedItems.length > 0;
    manualSearchResults.value = {};
    manualSearchErrors.value = {};
    manualSearchErrorStatuses.value = {};
    manualSearchingIds.value.clear();
    manualSearchRequestIds.clear();
    matches.value = orderedItems.map(createMissingMatch);

    let nextIndex = 0;

    async function searchNext(): Promise<void> {
      while (!controller.signal.aborted) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= searchItems.length) return;

        const item = searchItems[index];
        if (!item) return;

        let result: ChartTrackMatch;
        try {
          const query = `${item.artist.trim()} - ${item.name.trim()}`;
          const candidates = await searchSpotifyTracks(query);
          result = createTrackMatch(item, candidates[0]);
        } catch (error) {
          const unauthorized = error instanceof SpotifyApiError && error.status === 401;
          result = {
            ...createMissingMatch(item),
            searchError: error instanceof Error ? error.message : "Nie udało się wyszukać utworu",
            ...(error instanceof SpotifyApiError ? { searchErrorStatus: error.status } : {}),
          };
          if (unauthorized) controller.abort();
        }

        if (
          requestId !== currentRequestId ||
          (controller.signal.aborted && result.searchErrorStatus !== 401)
        )
          return;

        results.set(item.id, result);
        completedSearches.value += 1;
        matches.value = orderedItems.map(
          (orderedItem) => results.get(orderedItem.id) ?? createMissingMatch(orderedItem),
        );
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(searchConcurrency, orderedItems.length) }, () => searchNext()),
    );

    if (requestId === currentRequestId) isSearching.value = false;
  }

  function cancelSearch(): void {
    currentRequestId += 1;
    creationRequestId += 1;
    activeController?.abort();
    activeController = undefined;
    isSearching.value = false;
    isCreating.value = false;
    manualSearchingIds.value.clear();
    manualSearchRequestIds.clear();
  }

  async function searchCandidates(chartItemId: number, query: string): Promise<void> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    const requestId = currentRequestId;
    const searchId = (manualSearchRequestIds.get(chartItemId) ?? 0) + 1;
    manualSearchRequestIds.set(chartItemId, searchId);
    manualSearchingIds.value.add(chartItemId);
    manualSearchErrors.value = { ...manualSearchErrors.value, [chartItemId]: "" };
    manualSearchErrorStatuses.value = { ...manualSearchErrorStatuses.value };
    delete manualSearchErrorStatuses.value[chartItemId];

    try {
      const candidates = await searchSpotifyTracks(normalizedQuery);
      if (requestId !== currentRequestId || manualSearchRequestIds.get(chartItemId) !== searchId)
        return;
      manualSearchResults.value = {
        ...manualSearchResults.value,
        [chartItemId]: candidates,
      };
    } catch (error) {
      if (requestId !== currentRequestId || manualSearchRequestIds.get(chartItemId) !== searchId)
        return;
      manualSearchErrors.value = {
        ...manualSearchErrors.value,
        [chartItemId]: error instanceof Error ? error.message : "Nie udało się wyszukać utworu",
      };
      if (error instanceof SpotifyApiError) {
        manualSearchErrorStatuses.value = {
          ...manualSearchErrorStatuses.value,
          [chartItemId]: error.status,
        };
      }
    } finally {
      if (manualSearchRequestIds.get(chartItemId) === searchId) {
        manualSearchingIds.value.delete(chartItemId);
        manualSearchRequestIds.delete(chartItemId);
      }
    }
  }

  function selectCandidate(chartItemId: number, candidate: SpotifyTrack): void {
    matches.value = matches.value.map((match) => {
      if (match.chartItemId !== chartItemId) return match;
      const candidates = [
        candidate,
        ...match.candidates.filter(({ uri }) => uri !== candidate.uri),
      ];
      return {
        ...match,
        candidates,
        status: "matched",
        confidence: "manual",
        selectedUri: candidate.uri,
        skipped: false,
      };
    });
  }

  function toggleSkipped(chartItemId: number): void {
    matches.value = matches.value.map((match) =>
      match.chartItemId === chartItemId ? { ...match, skipped: !match.skipped } : match,
    );
  }

  function isSearchingManually(chartItemId: number): boolean {
    return manualSearchingIds.value.has(chartItemId);
  }

  async function createPlaylist(
    name: string,
    description = "",
    allowEmpty = false,
  ): Promise<SpotifyPlaylistSummary> {
    const selectedMatches = [...matches.value].filter((match) => !match.skipped);
    if (selectedMatches.some((match) => !match.selectedUri)) {
      throw new Error("Wybierz utwór dla każdego nierozstrzygniętego wiersza lub pomiń go.");
    }

    const trackUris = selectedMatches.flatMap((match) =>
      match.selectedUri ? [match.selectedUri] : [],
    );
    if (trackUris.length === 0 && !allowEmpty) {
      throw new Error("Pusta playlista wymaga osobnego potwierdzenia.");
    }

    const requestId = ++creationRequestId;
    isCreating.value = true;
    addedTrackCount.value = 0;
    totalTrackCount.value = trackUris.length;
    createdPlaylist.value = undefined;
    creationComplete.value = false;

    try {
      const profile = await getSpotifyUserProfile();
      if (requestId !== creationRequestId) {
        throw new DOMException("Playlist creation cancelled", "AbortError");
      }
      const playlist = await createSpotifyPlaylist(profile.id, name, description);
      if (requestId !== creationRequestId) return playlist;
      createdPlaylist.value = playlist;

      for (let offset = 0; offset < trackUris.length; offset += playlistBatchSize) {
        const batch = trackUris.slice(offset, offset + playlistBatchSize);
        await addSpotifyPlaylistTracks(playlist.id, batch);
        if (requestId === creationRequestId) addedTrackCount.value += batch.length;
      }

      if (requestId === creationRequestId) creationComplete.value = true;
      return playlist;
    } finally {
      if (requestId === creationRequestId) isCreating.value = false;
    }
  }

  onScopeDispose(cancelSearch);

  return {
    matches,
    completedSearches,
    totalSearches,
    isSearching,
    isCreating,
    addedTrackCount,
    totalTrackCount,
    createdPlaylist,
    creationComplete,
    manualSearchResults,
    manualSearchErrors,
    manualSearchErrorStatuses,
    matchChart,
    cancelSearch,
    searchCandidates,
    selectCandidate,
    toggleSkipped,
    isSearchingManually,
    createPlaylist,
  };
}
