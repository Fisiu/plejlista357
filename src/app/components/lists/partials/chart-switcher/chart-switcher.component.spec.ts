import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { ChartSwitcherComponent } from './chart-switcher.component';

describe('ChartSwitcherComponent', () => {
  let component: ChartSwitcherComponent;
  let fixture: ComponentFixture<ChartSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
