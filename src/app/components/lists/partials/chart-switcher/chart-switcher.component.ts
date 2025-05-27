import { Component, computed, inject, Input, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { Subject, takeUntil } from 'rxjs';
import { ChartType } from 'src/app/services/chart-type.type';
import { RadioChartService } from 'src/app/services/radio-chart.service';

@Component({
  selector: 'app-chart-switcher',
  imports: [FormsModule, ButtonModule, InputNumberModule],
  templateUrl: './chart-switcher.component.html',
  styleUrl: './chart-switcher.component.scss',
})
export class ChartSwitcherComponent implements OnDestroy {
  @Input({ required: true }) chartType!: ChartType;

  private readonly radioChartService = inject(RadioChartService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  loading = false;

  chartNumber = computed(() => this.radioChartService.latestChartNumber());
  latestChartNumber = this.radioChartService.latestChartNumber.asReadonly();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onChartNumberChange(value: number): void {
    this.radioChartService.getChartByNumber(this.chartType, value).pipe(takeUntil(this.destroy$)).subscribe();
  }
}
