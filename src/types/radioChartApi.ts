export interface RadioChartListItem {
  uuid: string
  chartTemplateSlug: string
  no: number
  name: string
  publication: string
}

export interface RadioChartListResponse {
  _embedded: {
    charts: RadioChartListItem[]
  }
}

export interface RadioChartResultItem {
  id: string
  name: string
  artist: string
  meta: {
    position: number
    new: boolean
    appearances: number
    lastPosition: number
    change: number | false
  }
}

export interface RadioChartPublicResults {
  name: string
  no: number
  publication: string
  previous: string | null
  summary: {
    new: number
    up: number
    down: number
    same: number
    maxTimesOnChart: number
  }
  results: {
    mainChart: {
      items: RadioChartResultItem[]
    }
    waitingRoom?: {
      items: RadioChartResultItem[]
    }
  }
}
