import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaylistConfirmComponent } from './playlist-confirm.component';

describe('PlaylistConfirmComponent', () => {
  let component: PlaylistConfirmComponent;
  let fixture: ComponentFixture<PlaylistConfirmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaylistConfirmComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaylistConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
