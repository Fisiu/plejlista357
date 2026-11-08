import axios from 'axios'

import { convertRadioChart } from '@/api/radioChartConverter'
import type { Chart, ChartType } from '@/types/radioChart'
import type {
  RadioChartListItem,
  RadioChartListResponse,
  RadioChartPublicResults,
} from '@/types/radioChartApi'

const chartResultsEndpoint = 'https://static.radio357.pl/api/content/v1/charts'
const weeklyChartListEndpoint = `${chartResultsEndpoint}/lista/all`
const specialChartListEndpoint = `${chartResultsEndpoint}/top/all`
const chartListEndpoints: Record<ChartType, string> = {
  weekly: weeklyChartListEndpoint,
  top: specialChartListEndpoint,
  'top-pl': specialChartListEndpoint,
  'metal-top': specialChartListEndpoint,
}

const chartCache = new Map<string, Chart>()

function getChartType(chart: RadioChartListItem): ChartType | undefined {
  if (chart.chartTemplateSlug === 'lista') return 'weekly'
  if (chart.name.includes('Metal Top Radia')) return 'metal-top'
  if (chart.name.includes('Polski Top Radia')) return 'top-pl'
  if (chart.name.includes('Top Radia')) return 'top'
}

function getErrorMessage(
  chartType: ChartType,
  chartNumber: number | 'latest',
  error: unknown,
): Error {
  if (axios.isAxiosError(error)) {
    return new Error(
      `Unable to load ${chartType} chart ${chartNumber}: ${error.response?.status ?? error.message}`,
    )
  }

  return error instanceof Error ? error : new Error('Unable to load chart')
}

async function getChartList(
  chartType: ChartType,
  signal?: AbortSignal,
): Promise<RadioChartListItem[]> {
  const response = await axios.get<RadioChartListResponse>(chartListEndpoints[chartType], {
    signal,
  })

  return response.data._embedded.charts.filter((chart) => getChartType(chart) === chartType)
}

async function getChart(
  chartType: ChartType,
  metadata: RadioChartListItem,
  charts: readonly RadioChartListItem[],
  signal?: AbortSignal,
): Promise<Chart> {
  const cacheKey = `${chartType}-${metadata.no}`
  const cachedChart = chartCache.get(cacheKey)

  if (cachedChart) {
    return cachedChart
  }

  const response = await axios.get<RadioChartPublicResults>(
    `${chartResultsEndpoint}/${metadata.uuid}/results/public`,
    { signal },
  )

  const chart = convertRadioChart(chartType, metadata, response.data, charts)
  chartCache.set(cacheKey, chart)
  return chart
}

export async function getLatestChart(chartType: ChartType, signal?: AbortSignal): Promise<Chart> {
  try {
    const charts = await getChartList(chartType, signal)
    const latestChart = charts
      .filter((chart) => Date.parse(chart.publication) <= Date.now())
      .sort(
        (left, right) =>
          Date.parse(right.publication) - Date.parse(left.publication) || right.no - left.no,
      )[0]

    if (!latestChart) {
      throw new Error(`Unable to load ${chartType} chart latest: no published chart available`)
    }

    return await getChart(chartType, latestChart, charts, signal)
  } catch (error) {
    throw getErrorMessage(chartType, 'latest', error)
  }
}

export async function getChartByNumber(
  chartType: ChartType,
  chartNumber: number,
  signal?: AbortSignal,
): Promise<Chart> {
  const cacheKey = `${chartType}-${chartNumber}`
  const cachedChart = chartCache.get(cacheKey)

  if (cachedChart) {
    return cachedChart
  }

  try {
    const charts = await getChartList(chartType, signal)
    const metadata = charts.find((chart) => chart.no === chartNumber)

    if (!metadata) {
      throw new Error(`Unable to load ${chartType} chart ${chartNumber}: chart not found`)
    }

    return await getChart(chartType, metadata, charts, signal)
  } catch (error) {
    throw getErrorMessage(chartType, chartNumber, error)
  }
}
