export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  artists: Array<{ name: string }>;
  album?: {
    name: string;
    images?: Array<{ url: string; height?: number | null; width?: number | null }>;
  };
  external_urls?: { spotify: string };
}

export type ChartTrackMatchStatus = "matched" | "ambiguous" | "missing";
export type ChartTrackMatchConfidence = "exact" | "probable" | "manual" | "ambiguous" | "missing";

export interface ChartTrackMatch {
  chartItemId: number;
  position: number;
  artist: string;
  title: string;
  status: ChartTrackMatchStatus;
  confidence: ChartTrackMatchConfidence;
  selectedUri?: string;
  skipped?: boolean;
  searchError?: string;
  searchErrorStatus?: number;
  candidates: SpotifyTrack[];
}
