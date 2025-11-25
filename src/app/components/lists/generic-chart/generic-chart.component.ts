
import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { finalize, Subject, takeUntil } from 'rxjs';
import { ChartType } from 'src/app/services/chart-type.type';
import { RadioChartService } from 'src/app/services/radio-chart.service';
import { ChartSwitcherComponent } from '../partials/chart-switcher/chart-switcher.component';
import { CreateSpotifyPlaylistDialogComponent } from '../partials/create-spotify-playlist-dialog/create-spotify-playlist-dialog.component';
import { NumberedTextAreaComponent } from '../partials/numbered-text-area/numbered-text-area.component';

@Component({
  selector: 'app-generic-chart',
  imports: [
    MessageModule,
    ProgressSpinnerModule,
    ButtonModule,
    ChartSwitcherComponent,
    NumberedTextAreaComponent,
    CreateSpotifyPlaylistDialogComponent
],
  templateUrl: './generic-chart.component.html',
  styleUrl: './generic-chart.component.scss',
})
export class GenericChartComponent implements OnInit, OnDestroy {
  @Input({ required: true }) chartType!: ChartType;

  private readonly route = inject(ActivatedRoute);
  private readonly radioChartService = inject(RadioChartService);
  private readonly destroy$ = new Subject<void>();

  latestChart = this.radioChartService.chart.asReadonly();
  latestChartText = this.radioChartService.latestChartText.asReadonly();
  loading = signal<boolean>(false);

  ngOnInit(): void {
    this.chartType = (this.route.snapshot.data['chartType'] as ChartType) || 'weekly';
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
      .getLatestChart(this.chartType)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false)),
      )
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
      .getChartByNumber(this.chartType, chartNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => {
          const error = `Failed to load chart ${chartNumber}: ${err.message}`;
          console.error(error);
        },
      });
  }
}
