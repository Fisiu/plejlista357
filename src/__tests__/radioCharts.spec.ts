import axios from "axios";
import type { AxiosInstance } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getChartByNumber, getLatestChart } from "@/api/radioCharts";

vi.mock("axios", () => ({
  default: {
    get: vi.fn<AxiosInstance["get"]>(),
    isAxiosError: (error: unknown) =>
      typeof error === "object" && error !== null && "isAxiosError" in error,
  },
}));

const chartResponse = {
  results: {
    mainChart: { items: [] },
    waitingRoom: { items: [], label: "Poczekalnia" },
  },
  summary: { new: 0, up: 0, down: 0, same: 0, max_times_on_chart: 0 },
  name: "Lista Piosenek",
  no: "123",
  previous_no: "122",
  next_no: "124",
  published_at_date: "2026-09-22",
  document: "chart.pdf",
  title: "Lista Piosenek #123",
  title_template: "Lista Piosenek #{no}",
};

describe("radioCharts API", () => {
  afterEach(() => {
    vi.mocked(axios.get).mockReset();
  });

  it.each([
    ["weekly", "lista"],
    ["top", "top"],
    ["top-pl", "polski-top"],
  ] as const)("requests the latest %s chart", async (chartType, endpoint) => {
    vi.mocked(axios.get).mockResolvedValue({ data: chartResponse });

    await expect(getLatestChart(chartType)).resolves.toEqual(chartResponse);

    expect(axios.get).toHaveBeenCalledWith(
      `https://wyniki.radio357.pl/api/charts/${endpoint}/latest`,
      { signal: undefined },
    );
  });

  it("loads a numbered chart and reuses its cached response", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: chartResponse });

    await expect(getChartByNumber("weekly", 123)).resolves.toEqual(chartResponse);
    await expect(getChartByNumber("weekly", 123)).resolves.toEqual(chartResponse);

    expect(axios.get).toHaveBeenCalledOnce();
    expect(axios.get).toHaveBeenCalledWith("https://wyniki.radio357.pl/api/charts/lista/123", {
      signal: undefined,
    });
  });

  it("throws when the API responds with an error", async () => {
    vi.mocked(axios.get).mockRejectedValue({
      isAxiosError: true,
      response: { status: 503 },
    });

    await expect(getLatestChart("weekly")).rejects.toThrow(
      "Unable to load weekly chart latest: 503",
    );
  });
});
