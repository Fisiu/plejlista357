import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateSpotifyPlaylistDialogComponent } from './create-spotify-playlist-dialog.component';

describe('CreateSpotifyPlaylistDialogComponent', () => {
  let component: CreateSpotifyPlaylistDialogComponent;
  let fixture: ComponentFixture<CreateSpotifyPlaylistDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSpotifyPlaylistDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSpotifyPlaylistDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
