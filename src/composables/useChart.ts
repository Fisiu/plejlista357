import { computed, onMounted, onUnmounted, ref, toValue, type MaybeRefOrGetter } from "vue";

import { getChartByNumber, getLatestChart } from "@/api/radioCharts";
import type { Chart, ChartType } from "@/types/radioChart";

export function useChart(chartType: MaybeRefOrGetter<ChartType>) {
  const chart = ref<Chart>();
  const chartNumber = ref(0);
  const latestChartNumber = ref(0);
  const isLoading = ref(true);
  const error = ref<Error>();
  const unmountController = new AbortController();
  let latestRequestId = 0;

  const chartNumberInput = computed({
    get: () => chartNumber.value,
    set: (value: number | undefined) => {
      if (value !== undefined) onChartNumberValue(value);
    },
  });
  const mainChartItems = computed(() =>
    [...(chart.value?.results.mainChart.items ?? [])].reverse(),
  );

  async function loadChart(
    number: number,
    loadedChart?: Chart,
    inheritedRequestId?: number,
  ): Promise<void> {
    if (number < 1 || (latestChartNumber.value > 0 && number > latestChartNumber.value)) return;

    const requestId = inheritedRequestId ?? ++latestRequestId;
    const currentChartType = toValue(chartType);

    isLoading.value = true;
    error.value = undefined;

    try {
      const data =
        loadedChart ?? (await getChartByNumber(currentChartType, number, unmountController.signal));

      if (requestId !== latestRequestId) return;

      chart.value = data;
      chartNumber.value = number;
    } catch (loadError) {
      if (unmountController.signal.aborted || requestId !== latestRequestId) return;
      error.value =
        loadError instanceof Error ? loadError : new Error("Nie udało się pobrać listy");
    } finally {
      if (requestId === latestRequestId && !unmountController.signal.aborted)
        isLoading.value = false;
    }
  }

  async function loadLatestChart(forceLatest = false): Promise<void> {
    const requestId = ++latestRequestId;
    const currentChartType = toValue(chartType);
    const chartStorageKey = `radio-chart:${currentChartType}`;

    isLoading.value = true;
    error.value = undefined;

    try {
      const latestChart = await getLatestChart(currentChartType, unmountController.signal);

      if (requestId !== latestRequestId) return;

      const latestNumber = Number(latestChart.no);
      latestChartNumber.value = latestNumber;

      let savedNumber: string | null = null;
      try {
        savedNumber = forceLatest ? null : sessionStorage.getItem(chartStorageKey);
      } catch {
        savedNumber = null;
      }

      const requestedNumber = Number(savedNumber);
      const initialNumber =
        Number.isInteger(requestedNumber) && requestedNumber >= 1 && requestedNumber <= latestNumber
          ? requestedNumber
          : latestNumber;

      try {
        sessionStorage.setItem(chartStorageKey, String(initialNumber));
      } catch {
        // Storage may be unavailable in privacy-restricted environments.
      }

      await loadChart(
        initialNumber,
        initialNumber === latestNumber ? latestChart : undefined,
        requestId,
      );
    } catch (loadError) {
      if (unmountController.signal.aborted || requestId !== latestRequestId) return;
      error.value =
        loadError instanceof Error ? loadError : new Error("Nie udało się pobrać listy");
    } finally {
      if (requestId === latestRequestId && !unmountController.signal.aborted)
        isLoading.value = false;
    }
  }

  function onChartNumberValue(value: string | number): void {
    const number = Number(value);
    if (!Number.isInteger(number)) return;

    try {
      sessionStorage.setItem(`radio-chart:${toValue(chartType)}`, String(number));
    } catch {
      // Storage may be unavailable in privacy-restricted environments.
    }
    void loadChart(number);
  }

  onMounted(() => void loadLatestChart());
  onUnmounted(() => unmountController.abort());

  return {
    chart,
    chartNumber,
    chartNumberInput,
    error,
    isLoading,
    latestChartNumber,
    loadLatestChart,
    mainChartItems,
  };
}
