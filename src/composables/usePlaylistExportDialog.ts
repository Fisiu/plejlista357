import { ref, shallowRef, type Ref } from "vue";

import type { Chart } from "@/types/radioChart";
import type { ChartTrackMatch, SpotifyTrack } from "@/types/spotify";

interface PlaylistExportDialogOptions {
  manualSearchResults: Ref<Record<number, SpotifyTrack[]>>;
  selectCandidate: (chartItemId: number, candidate: SpotifyTrack) => void;
}

export function usePlaylistExportDialog({
  manualSearchResults,
  selectCandidate,
}: PlaylistExportDialogOptions) {
  const isOpen = ref(false);
  const reviewChart = shallowRef<Chart>();
  const manualQueries = ref<Record<number, string>>({});
  const manualSearchOpenIds = ref(new Set<number>());
  const emptyPlaylistConfirmed = ref(false);
  const creationError = ref("");
  const authenticationExpired = ref(false);

  function reset(): void {
    manualQueries.value = {};
    manualSearchOpenIds.value.clear();
    emptyPlaylistConfirmed.value = false;
    creationError.value = "";
    authenticationExpired.value = false;
  }

  function openManualSearch(match: ChartTrackMatch): void {
    const nextManualResults = { ...manualSearchResults.value };
    delete nextManualResults[match.chartItemId];
    manualSearchResults.value = nextManualResults;
    manualSearchOpenIds.value.add(match.chartItemId);
    manualQueries.value = {
      ...manualQueries.value,
      [match.chartItemId]: `${match.artist} - ${match.title}`,
    };
  }

  function closeManualSearch(chartItemId: number): void {
    manualSearchOpenIds.value.delete(chartItemId);
  }

  function isManualSearchOpen(chartItemId: number): boolean {
    return manualSearchOpenIds.value.has(chartItemId);
  }

  function hasManualSearchResults(chartItemId: number): boolean {
    return Boolean(manualSearchResults.value[chartItemId]?.length);
  }

  function getCandidateOptions(match: ChartTrackMatch): SpotifyTrack[] {
    const candidates = [
      ...match.candidates,
      ...(manualSearchResults.value[match.chartItemId] ?? []),
    ];
    return candidates.filter(
      (candidate, index) => candidates.findIndex(({ uri }) => uri === candidate.uri) === index,
    );
  }

  function getCandidateMenuOptions(
    match: ChartTrackMatch,
  ): Array<SpotifyTrack & { label: string }> {
    return getCandidateOptions(match).map((candidate) => ({
      ...candidate,
      label: `${candidate.artists.map(({ name }) => name).join(", ")} - ${candidate.name}`,
    }));
  }

  function selectCandidateFromMenu(match: ChartTrackMatch, selectedUri: string | null): void {
    const candidate = getCandidateOptions(match).find(({ uri }) => uri === selectedUri);
    if (candidate) selectCandidate(match.chartItemId, candidate);
  }

  function statusPresentation(match: ChartTrackMatch): {
    icon: string;
    label: string;
    color: string;
  } {
    if (match.skipped) {
      return { icon: "i-lucide-circle-minus", label: "Utwór pominięty", color: "text-muted" };
    }
    if (match.status === "matched") {
      const label =
        match.confidence === "manual" ? "Ręcznie wybrano dopasowanie" : "Dopasowano utwór";
      return { icon: "i-lucide-circle-check", label, color: "text-success" };
    }
    if (match.status === "ambiguous") {
      return {
        icon: "i-lucide-circle-help",
        label: "Wybierz właściwe dopasowanie",
        color: "text-warning",
      };
    }
    return {
      icon: "i-lucide-circle-x",
      label: match.searchError ?? "Nie znaleziono dopasowania",
      color: "text-error",
    };
  }

  return {
    isOpen,
    reviewChart,
    manualQueries,
    manualSearchOpenIds,
    emptyPlaylistConfirmed,
    creationError,
    authenticationExpired,
    reset,
    openManualSearch,
    closeManualSearch,
    isManualSearchOpen,
    hasManualSearchResults,
    getCandidateOptions,
    getCandidateMenuOptions,
    selectCandidateFromMenu,
    statusPresentation,
  };
}
