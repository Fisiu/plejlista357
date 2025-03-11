import { Component, computed, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { Subject, takeUntil } from 'rxjs';
import { RadioChartService } from 'src/app/services/radio-chart.service';

@Component({
  selector: 'app-chart-switcher',
  imports: [FormsModule, ButtonModule, InputNumberModule],
  templateUrl: './chart-switcher.component.html',
  styleUrl: './chart-switcher.component.scss',
})
export class ChartSwitcherComponent implements OnDestroy {
  private readonly radioChartService = inject(RadioChartService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  loading = false;

  chartNumber = computed(() =>
    this.radioChartService.latestWeeklyChartNumber(),
  );
  latestChartNumber =
    this.radioChartService.latestWeeklyChartNumber.asReadonly();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onChartNumberChange(value: number): void {
    this.radioChartService
      .getChartByNumber(value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'info',
            summary: 'Info',
            detail: `Chart ${value} fetched!`,
          });
        },
      });
  }
}
