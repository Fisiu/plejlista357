export interface Chart {
  results: Results;
  summary: Summary;
  name: string;
  no: string;
  previous_no: string;
  next_no: string;
  published_at_date: string;
  document: string;
  title: string;
  title_template: string;
}

export interface Summary {
  new: number;
  up: number;
  down: number;
  same: number;
  max_times_on_chart: number;
}

export interface Results {
  mainChart: MainChart;
  waitingRoom: WaitingRoom;
}

export interface MainChart {
  items: Item[];
}

export interface WaitingRoom {
  items: Item[];
  label: string;
}

export interface Item {
  id: number;
  name: string;
  artist: string;
  position: number;
  is_new: boolean;
  last_position: number;
  times_on_chart: number;
  change: number;
}
