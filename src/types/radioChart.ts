export type ChartType = "weekly" | "top" | "top-pl";

export interface Chart {
  results: ChartResults;
  summary: ChartSummary;
  name: string;
  no: string;
  previous_no: string;
  next_no: string;
  published_at_date: string;
  document: string;
  title: string;
  title_template: string;
}

export interface ChartSummary {
  new: number;
  up: number;
  down: number;
  same: number;
  max_times_on_chart: number;
}

export interface ChartResults {
  mainChart: ChartSection;
  waitingRoom: ChartSection;
}

export interface ChartSection {
  items: ChartItem[];
  label?: string;
}

export interface ChartItem {
  id: number;
  name: string;
  artist: string;
  position: number;
  is_new: boolean;
  last_position: number;
  times_on_chart: number;
  change: number;
}
