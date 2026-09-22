import { afterEach, describe, expect, it, vi } from "vitest";

import { getLatestChart } from "@/api/radioCharts";

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

describe("getLatestChart", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["weekly", "lista"],
    ["top", "top"],
    ["top-pl", "polski-top"],
  ] as const)("requests the latest %s chart", async (chartType, endpoint) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(chartResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getLatestChart(chartType)).resolves.toEqual(chartResponse);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://wyniki.radio357.pl/api/charts/${endpoint}/latest`,
      { signal: undefined },
    );
  });

  it("throws when the API responds with an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(getLatestChart("weekly")).rejects.toThrow("Unable to load weekly chart: 503");
  });
});
