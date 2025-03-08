import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { WeeklyComponent } from './weekly.component';

describe('WeeklyComponent', () => {
  let component: WeeklyComponent;
  let fixture: ComponentFixture<WeeklyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeeklyComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(WeeklyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
