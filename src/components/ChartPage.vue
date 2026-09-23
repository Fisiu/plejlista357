<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { getChartByNumber, getLatestChart } from '@/api/radioCharts';
import type { Chart, ChartType } from '@/types/radioChart';

const props = defineProps<{
  chartType: ChartType;
}>();

const chart = ref<Chart>();
const chartNumber = ref(0);
const latestChartNumber = ref(0);
const isLoading = ref(true);
const error = ref<Error>();
const controller = new AbortController();
const chartNumberInput = computed({
  get: () => chartNumber.value,
  set: (value: number | undefined) => {
    if (value !== undefined) onChartNumberValue(value);
  },
});
const mainChartItems = computed(() => [...(chart.value?.results.mainChart.items ?? [])].reverse());

async function loadChart(number: number, loadedChart?: Chart): Promise<void> {
  if (number < 1 || number > latestChartNumber.value) {
    return;
  }

  isLoading.value = true;
  error.value = undefined;

  try {
    // Reuse the latest response instead of requesting the same chart by number.
    chart.value = loadedChart ?? (await getChartByNumber(props.chartType, number, controller.signal));
    chartNumber.value = number;
  } catch (loadError) {
    if (controller.signal.aborted) return;
    error.value = loadError instanceof Error ? loadError : new Error('Nie udało się pobrać listy');
  } finally {
    if (!controller.signal.aborted) {
      isLoading.value = false;
    }
  }
}

async function loadLatestChart(): Promise<void> {
  isLoading.value = true;
  error.value = undefined;

  try {
    const latestChart = await getLatestChart(props.chartType, controller.signal);
    const latestNumber = Number(latestChart.no);
    latestChartNumber.value = latestNumber;
    await loadChart(latestNumber, latestChart);
  } catch (loadError) {
    if (controller.signal.aborted) return;
    error.value = loadError instanceof Error ? loadError : new Error('Nie udało się pobrać listy');
  } finally {
    if (!controller.signal.aborted) {
      isLoading.value = false;
    }
  }
}

function onChartNumberValue(value: string | number): void {
  const number = Number(value);

  if (Number.isInteger(number)) {
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
onUnmounted(() => controller.abort());
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
                <p class="text-lg font-semibold text-highlighted">{{ chart.name }}</p>
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
                  <span class="text-sm tabular-nums text-muted">{{ item.position }}</span>
                  <sup>
                    <UBadge :color="changeColor(item.change)" variant="outline" size="sm" class="tabular-nums">
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
