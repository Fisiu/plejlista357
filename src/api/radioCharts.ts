import type { Chart, ChartType } from '@/types/radioChart';

const chartEndpoints: Record<ChartType, string> = {
  weekly: 'https://wyniki.radio357.pl/api/charts/lista',
  top: 'https://wyniki.radio357.pl/api/charts/top',
  'top-pl': 'https://wyniki.radio357.pl/api/charts/polski-top',
};

export async function getLatestChart(
  chartType: ChartType,
  signal?: AbortSignal,
): Promise<Chart> {
  const response = await fetch(`${chartEndpoints[chartType]}/latest`, { signal });

  if (!response.ok) {
    throw new Error(`Unable to load ${chartType} chart: ${response.status}`);
  }

  return response.json() as Promise<Chart>;
}
