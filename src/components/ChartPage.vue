<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { getChartByNumber, getLatestChart } from '@/api/radioCharts';
import type { Chart, ChartType } from '@/types/radioChart';

const props = defineProps<{
  chartType: ChartType;
}>();

const chartStorageKey = `radio-chart:${props.chartType}`;
const chart = ref<Chart>();
const chartNumber = ref(0);
const latestChartNumber = ref(0);
const isLoading = ref(true);
const error = ref<Error>();

// 1. Shared AbortController only for component unmount
const unmountController = new AbortController();

// 2. Shared request counter across both load functions
let latestRequestId = 0;

const chartNumberInput = computed({
  get: () => chartNumber.value,
  set: (value: number | undefined) => {
    if (value !== undefined) onChartNumberValue(value);
  },
});
const mainChartItems = computed(() => [...(chart.value?.results.mainChart.items ?? [])].reverse());

async function loadChart(number: number, loadedChart?: Chart, inheritedRequestId?: number): Promise<void> {
  if (number < 1 || (latestChartNumber.value > 0 && number > latestChartNumber.value)) {
    return;
  }

  // Use the requestId passed from loadLatestChart, or generate a fresh one
  const requestId = inheritedRequestId ?? ++latestRequestId;

  isLoading.value = true;
  error.value = undefined;

  try {
    const data = loadedChart ?? (await getChartByNumber(props.chartType, number, unmountController.signal));

    // Stale check: discard if a newer request was started
    if (requestId !== latestRequestId) return;

    chart.value = data;
    chartNumber.value = number;
  } catch (loadError) {
    if (unmountController.signal.aborted || requestId !== latestRequestId) return;
    error.value = loadError instanceof Error ? loadError : new Error('Nie udało się pobrać listy');
  } finally {
    if (requestId === latestRequestId && !unmountController.signal.aborted) {
      isLoading.value = false;
    }
  }
}

async function loadLatestChart(forceLatest = false): Promise<void> {
  const requestId = ++latestRequestId;

  isLoading.value = true;
  error.value = undefined;

  try {
    const latestChart = await getLatestChart(props.chartType, unmountController.signal);

    // Stale check after fetching latest issue info
    if (requestId !== latestRequestId) return;

    const latestNumber = Number(latestChart.no);
    latestChartNumber.value = latestNumber;

    let savedNumber: string | null = null;
    try {
      savedNumber = forceLatest ? null : sessionStorage.getItem(chartStorageKey);
    } catch {
      // Graceful fallback if storage is blocked
    }

    const requestedNumber = Number(savedNumber);
    const initialNumber =
      Number.isInteger(requestedNumber) && requestedNumber >= 1 && requestedNumber <= latestNumber
        ? requestedNumber
        : latestNumber;

    try {
      sessionStorage.setItem(chartStorageKey, String(initialNumber));
    } catch {
      // Graceful fallback if storage is blocked
    }

    if (initialNumber === latestNumber) {
      await loadChart(latestNumber, latestChart, requestId);
    } else {
      await loadChart(initialNumber, undefined, requestId);
    }
  } catch (loadError) {
    if (unmountController.signal.aborted || requestId !== latestRequestId) return;
    error.value = loadError instanceof Error ? loadError : new Error('Nie udało się pobrać listy');
  } finally {
    if (requestId === latestRequestId && !unmountController.signal.aborted) {
      isLoading.value = false;
    }
  }
}

function onChartNumberValue(value: string | number): void {
  const number = Number(value);

  if (Number.isInteger(number)) {
    try {
      sessionStorage.setItem(chartStorageKey, String(number));
    } catch {
      // Graceful fallback if storage is blocked
    }
    void loadChart(number);
  }
}

function changeColor(change: number | false): 'success' | 'error' | 'neutral' {
  if (change === false || change === 0) return 'neutral';
  if (change > 0) return 'success';
  if (change < 0) return 'error';
  return 'neutral';
}

function changeLabel(change: number | false): string {
  if (change === false || change === 0) return '—';
  return change > 0 ? `+${change}` : String(change);
}

onMounted(() => void loadLatestChart());
onUnmounted(() => unmountController.abort());
</script>

<template>
  <UPage>
    <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <UPageBody>
        <UAlert v-if="error" color="error" title="Nie udało się pobrać listy">
          {{ error.message }}
        </UAlert>

        <template v-if="chart">
          <UCard class="mb-6">
            <div class="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div class="flex flex-col items-center text-center lg:items-start lg:text-left">
                <div class="flex items-center gap-2">
                  <p class="text-lg font-semibold text-highlighted">{{ chart.name }}</p>
                  <UButton icon="i-lucide-list-restart" color="neutral" variant="ghost" size="sm" :disabled="isLoading"
                    class="cursor-pointer" aria-label="Najnowsze notowanie" title="Najnowsze notowanie"
                    @click="loadLatestChart(true)" />
                </div>
                <p class="text-sm text-muted">{{ chart.title }} · {{ chart.published_at_date }}</p>
              </div>

              <div class="flex flex-col items-center gap-2">
                <span class="text-xs font-medium uppercase tracking-wide text-muted">Przejdź do notowania</span>
                <div class="flex flex-wrap items-center gap-3">
                  <UInputNumber v-model="chartNumberInput" aria-label="Wybierz numer notowania" size="sm" class="w-36"
                    increment-icon="i-lucide-arrow-right" decrement-icon="i-lucide-arrow-left" :min="1"
                    :max="latestChartNumber" :step="1" :disabled="isLoading" />
                </div>
              </div>

              <div class="flex flex-wrap justify-center gap-x-6 gap-y-3 lg:justify-end">
                <div class="flex flex-col items-center lg:items-end">
                  <span class="text-xl font-semibold text-highlighted">{{ chart.results.mainChart.items.length }}</span>
                  <span class="text-xs text-muted">Utworów</span>
                </div>
                <div class="flex flex-col items-center lg:items-end">
                  <span class="text-xl font-semibold text-highlighted">{{ chart.summary.new }}</span>
                  <span class="text-xs text-muted">Nowości</span>
                </div>
                <div class="flex flex-col items-center lg:items-end">
                  <span class="text-xl font-semibold text-highlighted">{{ chartNumber }}</span>
                  <span class="text-xs text-muted">Notowanie</span>
                </div>
              </div>
            </div>
          </UCard>

          <div v-if="isLoading" class="flex justify-center py-16">
            <UProgress animation="carousel" class="w-48" aria-label="Ładowanie listy" />
          </div>

          <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
            <div
              class="hidden grid-cols-[4rem_minmax(0,1fr)] items-center gap-4 border-b border-default px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted sm:grid">
              <span class="select-none">#</span>
              <span>Utwór</span>
            </div>
            <ol>
              <li v-for="item in mainChartItems" :key="item.id"
                class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3 border-b border-default px-4 py-2.5 transition-colors duration-150 hover:bg-elevated/50 last:border-0 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-4">
                <div class="flex select-none items-center gap-1">
                  <span class="w-6 shrink-0 text-right text-sm tabular-nums text-muted">{{ item.position }}</span>
                  <sup>
                    <UBadge :color="changeColor(item.change)" variant="soft" size="sm"
                      class="min-w-9 justify-center tabular-nums">
                      {{ changeLabel(item.change) }}
                    </UBadge>
                  </sup>
                </div>
                <div class="min-w-0 select-text">
                  <div class="flex min-w-0 items-center gap-2">
                    <p class="truncate text-sm">
                      <span class="text-muted">{{ item.artist }} - </span>
                      <span class="font-medium text-highlighted">{{ item.name }}</span>
                    </p>
                    <UBadge v-if="item.is_new" color="primary" variant="subtle" size="sm" class="select-none shrink-0">
                      Nowość
                    </UBadge>
                  </div>
                </div>
              </li>
            </ol>
          </UCard>
        </template>

        <div v-else-if="isLoading" class="flex justify-center py-16">
          <UProgress animation="carousel" class="w-48" aria-label="Ładowanie listy" />
        </div>
      </UPageBody>
    </div>
  </UPage>
</template>
