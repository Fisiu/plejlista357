import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { finalize, Subject, takeUntil } from 'rxjs';
import { RadioChartService } from 'src/app/services/radio-chart.service';
import { ChartSwitcherComponent } from '../partials/chart-switcher/chart-switcher.component';
import { CreateSpotifyPlaylistDialogComponent } from '../partials/create-spotify-playlist-dialog/create-spotify-playlist-dialog.component';
import { NumberedTextAreaComponent } from '../partials/numbered-text-area/numbered-text-area.component';

@Component({
  selector: 'app-weekly',
  imports: [
    CommonModule,
    MessageModule,
    ProgressSpinnerModule,
    ButtonModule,
    NumberedTextAreaComponent,
    ChartSwitcherComponent,
    CreateSpotifyPlaylistDialogComponent,
  ],
  templateUrl: './weekly.component.html',
  styleUrl: './weekly.component.scss',
})
export class WeeklyComponent implements OnInit, OnDestroy {
  private readonly radioChartService = inject(RadioChartService);
  private readonly destroy$ = new Subject<void>();

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

  /**
   * Fetches the latest chart number and loads the corresponding chart.
   */
  getLatestChart(): void {
    this.loading.set(true);

    this.radioChartService
      .getLatestChart()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chart) => {
          this.loadChart(+chart.no);
        },
      });
  }

  /**
   * Loads the chart data for a given chart number, handling success and error states.
   * @param chartNumber - The number of the chart to load.
   */
  private loadChart(chartNumber: number): void {
    this.radioChartService
      .getChartByNumber(chartNumber)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        error: (err) => {
          const error = `Failed to load chart ${chartNumber}: ${err.message}`;
          console.error(error);
        },
      });
  }
}
