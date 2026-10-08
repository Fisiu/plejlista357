import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getChartByNumber, getLatestChart } from "@/api/radioCharts";
import { useChart } from "@/composables/useChart";
import type { Chart } from "@/types/radioChart";

vi.mock("@/api/radioCharts", () => ({
  getChartByNumber: vi.fn<typeof getChartByNumber>(),
  getLatestChart: vi.fn<typeof getLatestChart>(),
}));

const latestChart: Chart = {
  results: {
    mainChart: {
      items: [
        {
          id: 1,
          name: "First song",
          artist: "First artist",
          position: 1,
          is_new: false,
          last_position: 1,
          times_on_chart: 2,
          change: 0,
        },
        {
          id: 2,
          name: "Second song",
          artist: "Second artist",
          position: 2,
          is_new: true,
          last_position: 3,
          times_on_chart: 1,
          change: 1,
        },
      ],
    },
    waitingRoom: { items: [], label: "Poczekalnia" },
  },
  summary: { new: 1, up: 1, down: 0, same: 1, max_times_on_chart: 2 },
  name: "Lista Piosenek 357",
  no: "2",
  previous_no: "1",
  next_no: "3",
  published_at_date: "2026-09-22",
  document: "chart.pdf",
  title: "Lista Piosenek #2",
  title_template: "Lista Piosenek #{no}",
};

const numberedChart: Chart = { ...latestChart, no: "1", title: "Lista Piosenek #1" };
const newerChart: Chart = { ...latestChart, no: "3", title: "Lista Piosenek #3" };

type ChartState = ReturnType<typeof useChart>;

function mountChart() {
  let chartState!: ChartState;
  const harness = defineComponent({
    setup() {
      chartState = useChart("top");
      return () => h("div");
    },
  });

  const wrapper = mount(harness);
  return { chartState, wrapper };
}

describe("useChart", () => {
  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("loads the latest chart and reverses its items", async () => {
    vi.mocked(getLatestChart).mockResolvedValue(latestChart);

    const { chartState } = mountChart();
    await flushPromises();

    expect(getLatestChart).toHaveBeenCalledWith("top", expect.any(AbortSignal));
    expect(chartState.chart.value).toEqual(latestChart);
    expect(chartState.chartNumber.value).toBe(2);
    expect(chartState.latestChartNumber.value).toBe(2);
    expect(chartState.mainChartItems.value.map((item) => item.id)).toEqual([2, 1]);
    expect(sessionStorage.getItem("radio-chart:top")).toBe("2");
    expect(chartState.isLoading.value).toBe(false);
  });

  it("restores a saved chart number instead of loading the latest payload", async () => {
    sessionStorage.setItem("radio-chart:top", "1");
    vi.mocked(getLatestChart).mockResolvedValue(latestChart);
    vi.mocked(getChartByNumber).mockResolvedValue(numberedChart);

    const { chartState } = mountChart();
    await flushPromises();

    expect(getChartByNumber).toHaveBeenCalledWith("top", 1, expect.any(AbortSignal));
    expect(chartState.chart.value).toEqual(numberedChart);
    expect(chartState.chartNumber.value).toBe(1);
  });

  it("loads and persists a chart selected through the input", async () => {
    vi.mocked(getLatestChart).mockResolvedValue(latestChart);
    vi.mocked(getChartByNumber).mockResolvedValue(numberedChart);

    const { chartState } = mountChart();
    await flushPromises();

    chartState.chartNumberInput.value = 1;
    await flushPromises();

    expect(getChartByNumber).toHaveBeenCalledWith("top", 1, expect.any(AbortSignal));
    expect(sessionStorage.getItem("radio-chart:top")).toBe("1");
    expect(chartState.chart.value).toEqual(numberedChart);
  });

  it("ignores a stale latest-chart response", async () => {
    let resolveFirst!: (chart: Chart) => void;
    let resolveSecond!: (chart: Chart) => void;
    vi.mocked(getLatestChart)
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)));

    const { chartState } = mountChart();
    const secondRequest = chartState.loadLatestChart();

    resolveSecond(newerChart);
    await secondRequest;
    resolveFirst(latestChart);
    await flushPromises();

    expect(chartState.chart.value?.no).toBe("3");
    expect(chartState.latestChartNumber.value).toBe(3);
  });

  it("exposes API errors and stops loading", async () => {
    vi.mocked(getLatestChart).mockRejectedValue(new Error("Network unavailable"));

    const { chartState } = mountChart();
    await flushPromises();

    expect(chartState.error.value).toEqual(new Error("Network unavailable"));
    expect(chartState.isLoading.value).toBe(false);
  });

  it("aborts requests when the owner component unmounts", async () => {
    let resolveLatest!: (chart: Chart) => void;
    vi.mocked(getLatestChart).mockReturnValue(
      new Promise((resolve) => {
        resolveLatest = resolve;
      }),
    );

    const { wrapper } = mountChart();
    await flushPromises();
    const signal = vi.mocked(getLatestChart).mock.calls[0]?.[1];

    wrapper.unmount();
    resolveLatest(latestChart);
    await flushPromises();

    expect(signal?.aborted).toBe(true);
  });
});
