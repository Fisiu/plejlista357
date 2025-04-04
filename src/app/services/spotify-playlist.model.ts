import { Track } from '@spotify/web-api-ts-sdk';

export interface ArtistTitle {
  position: number;
  artist: string;
  title: string;
}

export interface MyTrack extends Track {
  srcPosition: number;
  srcArtist: string;
  srcTitle: string;
}

export interface DisplayTrack {
  id: string;
  spotifyId: string;
  position: string; // string
  srcArtistTitle: string;
  title: string;
  artist: string;
  coverUrl: string;
}

export interface DialogData {
  chartTitle: string;
  chartSummary: string;
}
