import type { Chart, ChartItem, ChartType } from '@/types/radioChart'
import type {
  RadioChartListItem,
  RadioChartPublicResults,
  RadioChartResultItem,
} from '@/types/radioChartApi'

function toChartItem(item: RadioChartResultItem): ChartItem {
  return {
    id: item.id,
    name: item.name,
    artist: item.artist,
    position: item.meta.position,
    is_new: item.meta.new,
    last_position: item.meta.lastPosition,
    times_on_chart: item.meta.appearances,
    change: item.meta.change,
  }
}

export function convertRadioChart(
  chartType: ChartType,
  metadata: RadioChartListItem,
  response: RadioChartPublicResults,
  charts: readonly RadioChartListItem[],
): Chart {
  const previousChart = charts.find((chart) => chart.uuid === response.previous)
  const nextChart = charts.find((chart) => chart.no === response.no + 1)
  const name =
    chartType === 'weekly'
      ? metadata.name.replace(/ - Notowanie #\d+$/, '')
      : metadata.name.replace(/^\d+\.{1,2}\s*/, '')

  return {
    results: {
      mainChart: {
        items: response.results.mainChart.items.map(toChartItem),
      },
      ...(response.results.waitingRoom
        ? {
            waitingRoom: {
              items: response.results.waitingRoom.items.map(toChartItem),
            },
          }
        : {}),
    },
    summary: {
      new: response.summary.new,
      up: response.summary.up,
      down: response.summary.down,
      same: response.summary.same,
      max_times_on_chart: response.summary.maxTimesOnChart,
    },
    name,
    no: String(response.no),
    previous_no: previousChart ? String(previousChart.no) : '',
    next_no: nextChart ? String(nextChart.no) : null,
    published_at_date: response.publication.slice(0, 10),
    document: '',
    title: response.name,
    title_template: `${name} #{no}`,
  }
}
