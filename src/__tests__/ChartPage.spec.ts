import { flushPromises, mount } from "@vue/test-utils";
import ui from "@nuxt/ui/vue-plugin";
import { defineComponent, h, nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ChartPage from "@/components/ChartPage.vue";
import { getChartByNumber, getLatestChart } from "@/api/radioCharts";
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
          name: "Yeah, Yeah, Yeah, Yeah, Yeah",
          artist: "U2",
          position: 1,
          is_new: false,
          last_position: 1,
          times_on_chart: 2,
          change: 0,
        },
      ],
    },
    waitingRoom: { items: [], label: "Poczekalnia" },
  },
  summary: { new: 0, up: 0, down: 0, same: 1, max_times_on_chart: 2 },
  name: "Lista Piosenek 357",
  no: "2",
  previous_no: "1",
  next_no: "3",
  published_at_date: "2026-09-22",
  document: "chart.pdf",
  title: "Lista Piosenek #2",
  title_template: "Lista Piosenek #{no}",
};

const numberedChart: Chart = {
  ...latestChart,
  no: "1",
  title: "Lista Piosenek #1",
};

const passthroughStub = defineComponent({
  setup(_, { slots }) {
    return () => h("div", slots.default?.());
  },
});

const inputNumberStub = defineComponent({
  name: "UInputNumber",
  props: { modelValue: { type: Number, required: false } },
  emits: ["update:modelValue"],
  setup() {
    return () => h("input");
  },
});

function mountChart(chartType: "top" | "top-pl") {
  return mount(ChartPage, {
    props: { chartType },
    global: {
      plugins: [ui],
      stubs: {
        UPage: passthroughStub,
        UPageBody: passthroughStub,
        UCard: passthroughStub,
        UAlert: passthroughStub,
        UProgress: passthroughStub,
        UButton: passthroughStub,
        UBadge: passthroughStub,
        UInputNumber: inputNumberStub,
      },
    },
  });
}

describe("ChartPage", () => {
  beforeEach(() => {
    vi.mocked(getLatestChart).mockResolvedValue(latestChart);
    vi.mocked(getChartByNumber).mockResolvedValue(numberedChart);
  });

  it("loads the latest chart for the requested chart type", async () => {
    const wrapper = mountChart("top-pl");

    await flushPromises();
    await nextTick();

    expect(getLatestChart).toHaveBeenCalledWith("top-pl", expect.any(AbortSignal));
    expect(getChartByNumber).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Lista Piosenek #2");
    expect(wrapper.text()).toContain("U2 - Yeah, Yeah, Yeah, Yeah, Yeah");
  });

  it("loads a numbered chart when the number input changes", async () => {
    const wrapper = mountChart("top");

    await flushPromises();
    await nextTick();
    await wrapper.findComponent({ name: "InputNumber" }).vm.$emit("update:modelValue", 1);
    await flushPromises();

    expect(getChartByNumber).toHaveBeenCalledWith("top", 1, expect.any(AbortSignal));
    expect(wrapper.text()).toContain("Lista Piosenek #1");
  });
});
