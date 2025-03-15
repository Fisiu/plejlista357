import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { finalize, Subject, takeUntil } from 'rxjs';
import { RadioChartService } from 'src/app/services/radio-chart.service';
import { ChartSwitcherComponent } from '../partials/chart-switcher/chart-switcher.component';
import { NumberedTextAreaComponent } from '../partials/numbered-text-area/numbered-text-area.component';

@Component({
  selector: 'app-weekly',
  imports: [
    CommonModule,
    MessageModule,
    ToastModule,
    NumberedTextAreaComponent,
    ProgressSpinnerModule,
    ChartSwitcherComponent,
  ],
  templateUrl: './weekly.component.html',
  styleUrl: './weekly.component.scss',
  providers: [MessageService],
})
export class WeeklyComponent implements OnInit, OnDestroy {
  private readonly messageService = inject(MessageService);
  private readonly radioChartService = inject(RadioChartService);
  private readonly destroy$ = new Subject<void>();
  private error: string | null = null;

  latestChart = this.radioChartService.weeklyChart.asReadonly();
  latestChartText = this.radioChartService.latestWeeklyChartText.asReadonly();
  loading = signal<boolean>(false);

  ngOnInit(): void {
    this.getLatestChart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getLatestChart(): void {
    this.loading.set(true);

    this.radioChartService
      .getLatestChartNumber()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chartNumber) => {
          this.loadChart(chartNumber);
        },
      });
  }

  private loadChart(chartNumber: number): void {
    this.radioChartService
      .getChartByNumber(chartNumber)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Chart fetched!',
          });
        },
        error: (err) => {
          this.error = `Failed to load chart ${chartNumber}: ${err.message}`;

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.error,
          });
        },
      });
  }
}
