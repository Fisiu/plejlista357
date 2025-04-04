import { TestBed } from '@angular/core/testing';

import { SpotifyPlaylistService } from './spotify-playlist.service';

describe('SpotifyPlaylistService', () => {
  let service: SpotifyPlaylistService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpotifyPlaylistService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
