import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { finalize, Subject, takeUntil } from 'rxjs';
import { DebugLoggerService } from '../../../services/debug-logger.service';
import { RadioChartService } from '../../../services/radio-chart.service';
import { NumberedTextAreaComponent } from '../partials/numbered-text-area/numbered-text-area.component';

@Component({
  selector: 'app-weekly',
  imports: [
    CommonModule,
    MessageModule,
    ToastModule,
    NumberedTextAreaComponent,
    ProgressSpinnerModule,
  ],
  templateUrl: './weekly.component.html',
  styleUrl: './weekly.component.scss',
  providers: [MessageService],
})
export class WeeklyComponent implements OnInit, OnDestroy {
  private readonly debugLogger = inject(DebugLoggerService);
  private readonly messageService = inject(MessageService);
  private readonly radioChartService = inject(RadioChartService);
  private readonly destroy$ = new Subject<void>();
  private error: string | null = null;

  latestChart = this.radioChartService.latestWeeklyChart.asReadonly();
  latestChartText = this.radioChartService.latestWeeklyChartText.asReadonly();
  loading = signal<boolean>(false);

  constructor() {
    effect(() => {
      // this.debugLogger.log(this.latestChart());
    });
  }

  ngOnInit(): void {
    this.getLatestChartNumber();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getLatestChartNumber(): void {
    this.loading.set(true);

    this.radioChartService
      .getLatestChart()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (data) => {
          this.radioChartService.latestWeeklyChartText.set(data);
        },
        error: (err) => {
          this.error = `Failed to load available charts: ${err.message}`;

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.error,
          });
        },
      });
  }
}
