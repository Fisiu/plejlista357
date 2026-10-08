<script setup lang="ts">
import { computed, watch } from 'vue'

import { SpotifyApiError } from '@/api/spotifyErrors'
import { usePlaylistExportDialog } from '@/composables/usePlaylistExportDialog'
import { useSpotifyPlaylist } from '@/composables/useSpotifyPlaylist'
import { useSpotifyStore } from '@/stores/spotify'
import type { Chart } from '@/types/radioChart'

const props = defineProps<{ chart: Chart }>()

const spotify = useSpotifyStore()
const {
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
} = useSpotifyPlaylist()
const {
  isOpen,
  reviewChart,
  manualQueries,
  emptyPlaylistConfirmed,
  creationError,
  authenticationExpired,
  reset: resetDialog,
  openManualSearch,
  closeManualSearch,
  isManualSearchOpen,
  hasManualSearchResults,
  getCandidateOptions,
  getCandidateMenuOptions,
  selectCandidateFromMenu,
  statusPresentation,
} = usePlaylistExportDialog({ manualSearchResults, selectCandidate })
const activeChart = computed(() => reviewChart.value ?? props.chart)
const chartTitle = computed(() => `${activeChart.value.name} - ${activeChart.value.title}`)
const playlistName = computed(() => `${activeChart.value.name} #${activeChart.value.no}`)
const matchCounts = computed(() => ({
  matched: matches.value.filter(({ status }) => status === 'matched').length,
  missing: matches.value.filter(({ status }) => status === 'missing').length,
}))
const unresolvedCount = computed(
  () => matches.value.filter((match) => !match.skipped && !match.selectedUri).length,
)
const selectedTrackCount = computed(
  () => matches.value.filter((match) => !match.skipped && match.selectedUri).length,
)
const needsEmptyConfirmation = computed(() => selectedTrackCount.value === 0)
const canCreatePlaylist = computed(
  () =>
    !isSearching.value &&
    !isCreating.value &&
    unresolvedCount.value === 0 &&
    (!needsEmptyConfirmation.value || emptyPlaylistConfirmed.value),
)

function openReview(): void {
  if (!spotify.isAuthenticated) {
    void spotify.connect()
    return
  }

  reviewChart.value = {
    ...props.chart,
    results: {
      ...props.chart.results,
      mainChart: {
        ...props.chart.results.mainChart,
        items: props.chart.results.mainChart.items.map((item) => ({ ...item })),
      },
    },
  }
  isOpen.value = true
  resetDialog()
  const snapshot = [...reviewChart.value.results.mainChart.items].reverse()
  void matchChart(snapshot)
}

function updateDialogOpen(open: boolean): void {
  if (!open && isCreating.value) return
  isOpen.value = open
}

async function createReviewedPlaylist(): Promise<void> {
  creationError.value = ''
  authenticationExpired.value = false

  try {
    await createPlaylist(
      playlistName.value,
      `Radio 357: ${activeChart.value.title}`,
      needsEmptyConfirmation.value && emptyPlaylistConfirmed.value,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się utworzyć playlisty'
    creationError.value = createdPlaylist.value
      ? `${message} Playlista zawiera ${addedTrackCount.value} z ${totalTrackCount.value} utworów.`
      : message
    if (error instanceof SpotifyApiError && error.status === 401) {
      spotify.disconnect()
      authenticationExpired.value = true
    }
  }
}

watch(isOpen, (open) => {
  if (!open && !isCreating.value) cancelSearch()
})

watch([matches, manualSearchErrorStatuses], ([currentMatches, manualErrors]) => {
  const searchUnauthorized =
    currentMatches.some((match) => match.searchErrorStatus === 401) ||
    Object.values(manualErrors).includes(401)
  if (!searchUnauthorized || authenticationExpired.value) return

  authenticationExpired.value = true
  creationError.value = 'Sesja Spotify wygasła. Połącz konto ponownie.'
  spotify.disconnect()
})
</script>

<template>
  <UButton :label="spotify.isAuthenticated ? 'Utwórz playlistę na Spotify' : 'Połącz ze Spotify'"
    icon="simple-icons:spotify" color="success" variant="soft" size="sm" :disabled="!spotify.isConfigured"
    :class="{ 'cursor-pointer': spotify.isConfigured }" @click="openReview" />

  <UModal :open="isOpen" title="Utwórz playlistę na Spotify" :ui="{
    overlay: 'bg-black/30',
    content:
      'w-[calc(100vw-1rem)] max-w-5xl max-h-[calc(100dvh-1rem)] overflow-hidden sm:w-[calc(100vw-2rem)]',
    body: 'min-h-0 overflow-y-auto',
  }" @update:open="updateDialogOpen">
    <template #body>
      <div class="space-y-5">
        <div>
          <p class="font-medium text-highlighted">{{ chartTitle }}</p>
          <p class="text-sm text-muted">{{ activeChart.published_at_date }}</p>
        </div>

        <div v-if="isSearching" class="space-y-2" role="status" aria-live="polite">
          <UProgress :value="completedSearches" :max="totalSearches" />
          <p class="text-sm text-muted">
            Sprawdzono {{ completedSearches }} z {{ totalSearches }} utworów
          </p>
        </div>

        <div v-if="isCreating" class="space-y-2" role="status" aria-live="polite">
          <UProgress :value="addedTrackCount" :max="Math.max(totalTrackCount, 1)" />
          <p class="text-sm text-muted">
            Dodano {{ addedTrackCount }} z {{ totalTrackCount }} utworów
          </p>
        </div>

        <UAlert v-if="creationError" color="error" title="Nie udało się utworzyć playlisty"
          :description="creationError" />
        <UButton v-if="authenticationExpired" label="Połącz ponownie ze Spotify" icon="simple-icons:spotify"
          color="success" variant="soft" @click="spotify.connect" />

        <UAlert v-if="createdPlaylist && creationComplete && !creationError" color="success"
          title="Playlista została utworzona" />
        <UButton v-if="createdPlaylist && creationComplete && !creationError"
          :to="createdPlaylist.external_urls.spotify" target="_blank" rel="noopener noreferrer" label="Otwórz w Spotify"
          icon="i-lucide-external-link" color="success" variant="soft" />
        <UButton v-if="createdPlaylist && creationError" :to="createdPlaylist.external_urls.spotify" target="_blank"
          rel="noopener noreferrer" label="Otwórz częściową playlistę" icon="i-lucide-external-link" color="neutral"
          variant="outline" />

        <template v-if="!isSearching">
          <dl class="grid grid-cols-2 gap-3 border-y border-default py-3 text-center">
            <div>
              <dt class="text-xs text-muted">Dopasowane</dt>
              <dd class="font-semibold text-highlighted">{{ matchCounts.matched }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">Brak wyników</dt>
              <dd class="font-semibold text-highlighted">{{ matchCounts.missing }}</dd>
            </div>
          </dl>

          <ol class="max-h-[min(65dvh,48rem)] divide-y divide-default overflow-y-auto pr-3 sm:pr-4">
            <li v-for="match in matches" :key="match.chartItemId"
              class="grid grid-cols-[1.5rem_minmax(0,1fr)_1.5rem_auto] items-start gap-1 py-2 sm:grid-cols-[2rem_minmax(0,1fr)_1.5rem_auto] sm:gap-2">
              <span class="pt-1 text-right text-xs tabular-nums text-muted">{{ match.position }}</span>
              <div class="flex min-w-0 flex-col items-stretch gap-1">
                <div class="flex min-w-0 items-center gap-2">
                  <p class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted"
                    :title="`${match.artist} - ${match.title}`">
                    {{ match.artist }} - {{ match.title }}
                  </p>
                  <UInputMenu v-if="
                    getCandidateOptions(match).length > 1 ||
                    manualSearchResults[match.chartItemId]?.length
                  " :items="getCandidateMenuOptions(match)" value-key="uri" label-key="label"
                    :model-value="match.selectedUri" placeholder="Wybierz dopasowanie"
                    :aria-label="`Wybierz wersję utworu ${match.title}`" size="xs"
                    class="w-30 max-w-[35vw] min-w-0 shrink-0 sm:w-66" :disabled="match.skipped"
                    @update:model-value="selectCandidateFromMenu(match, $event)" />
                </div>
              </div>
              <span class="inline-flex size-6 shrink-0 items-center justify-center"
                :class="statusPresentation(match).color" role="img" :aria-label="statusPresentation(match).label"
                :title="statusPresentation(match).label">
                <UIcon :name="statusPresentation(match).icon" class="size-4" />
              </span>
              <div class="flex items-center gap-1">
                <UButton :icon="isManualSearchOpen(match.chartItemId) && !hasManualSearchResults(match.chartItemId)
                  ? 'i-lucide-x' : 'i-lucide-search'
                  " color="neutral" variant="ghost" size="xs" :title="isManualSearchOpen(match.chartItemId)
                    && !hasManualSearchResults(match.chartItemId)
                    ? 'Zamknij wyszukiwanie'
                    : 'Szukaj zamiennika'
                    " :aria-label="isManualSearchOpen(match.chartItemId)
                      && !hasManualSearchResults(match.chartItemId)
                      ? `Zamknij wyszukiwanie dla ${match.title}`
                      : `Szukaj zamiennika dla ${match.title}`
                      " :aria-pressed="isManualSearchOpen(match.chartItemId)" @click="
                        isManualSearchOpen(match.chartItemId) && !hasManualSearchResults(match.chartItemId)
                          ? closeManualSearch(match.chartItemId)
                          : openManualSearch(match)
                        " />
                <UButton :icon="match.skipped ? 'i-lucide-undo-2' : 'i-lucide-skip-forward'" color="neutral"
                  variant="ghost" size="xs" :title="match.skipped ? 'Przywróć utwór' : 'Pomiń utwór'"
                  :aria-label="match.skipped ? `Przywróć ${match.title}` : `Pomiń ${match.title}`"
                  @click="toggleSkipped(match.chartItemId)" />
              </div>
              <form v-if="isManualSearchOpen(match.chartItemId) && !manualSearchResults[match.chartItemId]?.length"
                class="col-start-2 col-span-2 flex w-full min-w-0 items-center gap-2"
                @submit.prevent="searchCandidates(match.chartItemId, manualQueries[match.chartItemId] ?? '')">
                <UInput v-model="manualQueries[match.chartItemId]" size="xs" class="min-w-0 flex-1"
                  :aria-label="`Szukaj utworu dla ${match.title}`" />
                <UButton type="submit" icon="i-lucide-search" color="neutral" variant="outline" size="xs"
                  :loading="isSearchingManually(match.chartItemId)" :disabled="isSearchingManually(match.chartItemId)"
                  :aria-label="`Szukaj utworu dla ${match.title}`" />
              </form>
              <p v-if="manualSearchErrors[match.chartItemId]" class="col-start-2 col-span-2 text-xs text-error">
                {{ manualSearchErrors[match.chartItemId] }}
              </p>
            </li>
          </ol>
        </template>

        <UCheckbox v-if="needsEmptyConfirmation && !isSearching && !createdPlaylist" v-model="emptyPlaylistConfirmed"
          label="Potwierdzam utworzenie pustej playlisty" />

        <div v-if="!createdPlaylist" class="flex justify-end border-t border-default pt-4">
          <UButton label="Utwórz prywatną playlistę" icon="simple-icons:spotify" color="success" :loading="isCreating"
            :disabled="!canCreatePlaylist || !spotify.isAuthenticated" class="cursor-pointer"
            @click="createReviewedPlaylist" />
        </div>
      </div>
    </template>
  </UModal>
</template>
