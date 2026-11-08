import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getChartByNumber, getLatestChart } from '@/api/radioCharts'

vi.mock('axios', () => ({
  default: {
    get: vi.fn<AxiosInstance['get']>(),
    isAxiosError: (error: unknown) =>
      typeof error === 'object' && error !== null && 'isAxiosError' in error,
  },
}))

const weeklyChartsResponse = {
  _embedded: {
    charts: [
      {
        uuid: 'latest-weekly-chart',
        chartTemplateSlug: 'lista',
        no: 124,
        name: 'Lista Piosenek 357 - Notowanie #124',
        publication: '2026-09-22T22:00:00+02:00',
      },
      {
        uuid: 'open-weekly-chart',
        chartTemplateSlug: 'lista',
        no: 125,
        name: 'Lista Piosenek 357 - Notowanie #125',
        publication: '2999-09-22T22:00:00+02:00',
      },
      {
        uuid: 'other-chart',
        chartTemplateSlug: 'other',
        no: 999,
        name: 'Other chart',
        publication: '2026-09-23T22:00:00+02:00',
      },
    ],
  },
}

const weeklyChartResponse = {
  uuid: 'latest-weekly-chart',
  name: 'Lista Piosenek 357 - Notowanie #124',
  no: 124,
  publication: '2026-09-22T22:00:00+02:00',
  previous: null,
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
    waitingRoom: { items: [] },
  },
}

const specialChartsResponse = {
  _embedded: {
    charts: [
      {
        uuid: 'upcoming-top-chart',
        chartTemplateSlug: 'top',
        no: 6,
        name: '6.. Top Radia 357',
        publication: '2999-01-01T22:00:00+01:00',
      },
      {
        uuid: 'metal-top-chart',
        chartTemplateSlug: 'top-specjalny',
        no: 3,
        name: '3. Metal Top Radia 357',
        publication: '2020-10-31T23:59:59+01:00',
      },
      {
        uuid: 'polski-top-chart',
        chartTemplateSlug: 'top',
        no: 6,
        name: '6. Polski Top Radia 357',
        publication: '2020-05-03T22:00:00+02:00',
      },
      {
        uuid: 'top-chart',
        chartTemplateSlug: 'top',
        no: 5,
        name: '5. Top Radia 357',
        publication: '2020-01-01T22:00:00+01:00',
      },
      {
        uuid: 'other-top-chart',
        chartTemplateSlug: 'top-specjalny',
        no: 1,
        name: 'Top Pink Floyd Radia 357',
        publication: '2020-03-07T00:00:00+01:00',
      },
    ],
  },
}

const specialChartResponse = {
  ...weeklyChartResponse,
  name: '3. Metal Top Radia 357',
  no: 3,
}

describe('radioCharts API', () => {
  afterEach(() => {
    vi.mocked(axios.get).mockReset()
  })

  it('loads the latest published weekly chart from the chart list', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: weeklyChartsResponse })
      .mockResolvedValueOnce({ data: weeklyChartResponse })

    await expect(getLatestChart('weekly')).resolves.toMatchObject({
      name: 'Lista Piosenek 357',
      no: '124',
      title: 'Lista Piosenek 357 - Notowanie #124',
      published_at_date: '2026-09-22',
      summary: {
        new: 1,
        max_times_on_chart: 5,
      },
      results: {
        mainChart: {
          items: [
            {
              id: 'song-1',
              position: 1,
              is_new: true,
              times_on_chart: 1,
              change: false,
            },
          ],
        },
      },
    })

    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      'https://static.radio357.pl/api/content/v1/charts/lista/all',
      { signal: undefined },
    )
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      'https://static.radio357.pl/api/content/v1/charts/latest-weekly-chart/results/public',
      { signal: undefined },
    )
  })

  it.each([
    ['metal-top', 'metal-top-chart', '3', 'Metal Top Radia 357'],
    ['top-pl', 'polski-top-chart', '6', 'Polski Top Radia 357'],
    ['top', 'top-chart', '5', 'Top Radia 357'],
  ] as const)(
    'loads the latest %s chart by matching its name',
    async (chartType, uuid, chartNumber, name) => {
      vi.mocked(axios.get)
        .mockResolvedValueOnce({ data: specialChartsResponse })
        .mockResolvedValueOnce({
          data: { ...specialChartResponse, uuid, no: Number(chartNumber), name },
        })

      await expect(getLatestChart(chartType)).resolves.toMatchObject({
        name,
        no: chartNumber,
      })

      expect(axios.get).toHaveBeenNthCalledWith(
        1,
        'https://static.radio357.pl/api/content/v1/charts/top/all',
        { signal: undefined },
      )
      expect(axios.get).toHaveBeenNthCalledWith(
        2,
        `https://static.radio357.pl/api/content/v1/charts/${uuid}/results/public`,
        { signal: undefined },
      )
    },
  )

  it('loads a numbered weekly chart through its UUID and reuses its cached response', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({
        data: {
          _embedded: {
            charts: [
              {
                uuid: 'numbered-weekly-chart',
                chartTemplateSlug: 'lista',
                no: 123,
                name: 'Lista Piosenek 357 - Notowanie #123',
                publication: '2026-09-22T22:00:00+02:00',
              },
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          ...weeklyChartResponse,
          uuid: 'numbered-weekly-chart',
          no: 123,
        },
      })

    await expect(getChartByNumber('weekly', 123)).resolves.toMatchObject({ no: '123' })
    await expect(getChartByNumber('weekly', 123)).resolves.toMatchObject({ no: '123' })

    expect(axios.get).toHaveBeenCalledTimes(2)
    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      'https://static.radio357.pl/api/content/v1/charts/lista/all',
      { signal: undefined },
    )
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      'https://static.radio357.pl/api/content/v1/charts/numbered-weekly-chart/results/public',
      { signal: undefined },
    )
  })

  it('loads a numbered special chart through its UUID', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({
        data: {
          _embedded: {
            charts: [
              {
                uuid: 'numbered-metal-top-chart',
                chartTemplateSlug: 'top-specjalny',
                no: 77,
                name: '4. Metal Top Radia 357',
                publication: '2020-10-31T23:59:59+01:00',
              },
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          ...specialChartResponse,
          uuid: 'numbered-metal-top-chart',
          no: 77,
        },
      })

    await expect(getChartByNumber('metal-top', 77)).resolves.toMatchObject({
      name: 'Metal Top Radia 357',
      no: '77',
    })

    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      'https://static.radio357.pl/api/content/v1/charts/top/all',
      { signal: undefined },
    )
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      'https://static.radio357.pl/api/content/v1/charts/numbered-metal-top-chart/results/public',
      { signal: undefined },
    )
  })

  it('throws when the API responds with an error', async () => {
    vi.mocked(axios.get).mockRejectedValue({
      isAxiosError: true,
      response: { status: 503 },
    })

    await expect(getLatestChart('top')).rejects.toThrow('Unable to load top chart latest: 503')
  })
})
