import axios from "axios";

import type { Chart, ChartType } from "@/types/radioChart";

const chartEndpoints: Record<ChartType, string> = {
  weekly: "https://wyniki.radio357.pl/api/charts/lista",
  top: "https://wyniki.radio357.pl/api/charts/top",
  "top-pl": "https://wyniki.radio357.pl/api/charts/polski-top",
};

const chartCache = new Map<string, Chart>();

function chartUrl(chartType: ChartType, chartNumber: number | "latest"): string {
  return `${chartEndpoints[chartType]}/${chartNumber}`;
}

function getErrorMessage(
  chartType: ChartType,
  chartNumber: number | "latest",
  error: unknown,
): Error {
  if (axios.isAxiosError(error)) {
    return new Error(
      `Unable to load ${chartType} chart ${chartNumber}: ${error.response?.status ?? error.message}`,
    );
  }

  return error instanceof Error ? error : new Error("Unable to load chart");
}

export async function getLatestChart(chartType: ChartType, signal?: AbortSignal): Promise<Chart> {
  try {
    const response = await axios.get<Chart>(chartUrl(chartType, "latest"), { signal });
    return response.data;
  } catch (error) {
    throw getErrorMessage(chartType, "latest", error);
  }
}

export async function getChartByNumber(
  chartType: ChartType,
  chartNumber: number,
  signal?: AbortSignal,
): Promise<Chart> {
  const cacheKey = `${chartType}-${chartNumber}`;
  const cachedChart = chartCache.get(cacheKey);

  if (cachedChart) {
    return cachedChart;
  }

  try {
    const response = await axios.get<Chart>(chartUrl(chartType, chartNumber), { signal });
    chartCache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    throw getErrorMessage(chartType, chartNumber, error);
  }
}
