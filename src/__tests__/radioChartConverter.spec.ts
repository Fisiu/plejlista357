import { describe, expect, it } from 'vitest'

import { convertRadioChart } from '@/api/radioChartConverter'
import type { ChartType } from '@/types/radioChart'
import type { RadioChartListItem, RadioChartPublicResults } from '@/types/radioChartApi'

const metadata: RadioChartListItem = {
  uuid: 'chart-3',
  chartTemplateSlug: 'lista',
  no: 3,
  name: 'Lista Piosenek 357 - Notowanie #3',
  publication: '2026-09-22T22:00:00+02:00',
}

const response: RadioChartPublicResults = {
  name: 'Lista Piosenek 357 - Notowanie #3',
  no: 3,
  publication: '2026-09-22T22:00:00+02:00',
  previous: 'chart-2',
  summary: {
    new: 1,
    up: 2,
    down: 3,
    same: 4,
    maxTimesOnChart: 5,
  },
  results: {
    mainChart: {
      items: [
        {
          id: 'song-1',
          name: 'Song',
          artist: 'Artist',
          meta: {
            position: 1,
            new: true,
            appearances: 1,
            lastPosition: 0,
            change: false,
          },
        },
      ],
    },
    waitingRoom: {
      items: [
        {
          id: 'song-2',
          name: 'Waiting song',
          artist: 'Waiting artist',
          meta: {
            position: 36,
            new: false,
            appearances: 2,
            lastPosition: 35,
            change: -1,
          },
        },
      ],
    },
  },
}

describe('convertRadioChart', () => {
  it('converts API result fields and neighboring chart numbers', () => {
    const charts: RadioChartListItem[] = [
      { ...metadata, uuid: 'chart-2', no: 2 },
      metadata,
      { ...metadata, uuid: 'chart-4', no: 4 },
    ]

    expect(convertRadioChart('weekly', metadata, response, charts)).toEqual({
      results: {
        mainChart: {
          items: [
            {
              id: 'song-1',
              name: 'Song',
              artist: 'Artist',
              position: 1,
              is_new: true,
              last_position: 0,
              times_on_chart: 1,
              change: false,
            },
          ],
        },
        waitingRoom: {
          items: [
            {
              id: 'song-2',
              name: 'Waiting song',
              artist: 'Waiting artist',
              position: 36,
              is_new: false,
              last_position: 35,
              times_on_chart: 2,
              change: -1,
            },
          ],
        },
      },
      summary: {
        new: 1,
        up: 2,
        down: 3,
        same: 4,
        max_times_on_chart: 5,
      },
      name: 'Lista Piosenek 357',
      no: '3',
      previous_no: '2',
      next_no: '4',
      published_at_date: '2026-09-22',
      document: '',
      title: 'Lista Piosenek 357 - Notowanie #3',
      title_template: 'Lista Piosenek 357 #{no}',
    })
  })

  it.each([
    ['weekly', 'Lista Piosenek 357 - Notowanie #3', 'Lista Piosenek 357'],
    ['metal-top', '3. Metal Top Radia 357', 'Metal Top Radia 357'],
    ['top-pl', '6. Polski Top Radia 357', 'Polski Top Radia 357'],
    ['top', '6.. Top Radia 357', 'Top Radia 357'],
  ] as const)(
    'normalizes the %s chart name',
    (chartType: ChartType, chartName: string, expectedName: string) => {
      expect(
        convertRadioChart(
          chartType,
          { ...metadata, name: chartName },
          { ...response, name: chartName },
          [],
        ).name,
      ).toBe(expectedName)
    },
  )

  it('omits waiting room when the API does not include it', () => {
    const responseWithoutWaitingRoom: RadioChartPublicResults = {
      ...response,
      results: {
        mainChart: response.results.mainChart,
      },
    }

    expect(
      convertRadioChart('weekly', metadata, responseWithoutWaitingRoom, []).results,
    ).not.toHaveProperty('waitingRoom')
  })
})
