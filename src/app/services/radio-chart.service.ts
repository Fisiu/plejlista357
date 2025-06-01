import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { ChartType } from './chart-type.type';
import { Chart } from './radio-chart.model';

@Injectable({
  providedIn: 'root',
})
export class RadioChartService {
  private http = inject(HttpClient);

  private readonly endpoints: Record<ChartType, string> = {
    weekly: 'https://wyniki.radio357.pl/api/charts/lista',
    top: 'https://wyniki.radio357.pl/api/charts/top',
    'top-pl': 'https://wyniki.radio357.pl/api/charts/polski-top',
  };

  latestChartNumber = signal<number>(0);
  chart = signal<Chart | undefined>(undefined);
  latestChartText = signal<string[]>([]);

  // Persistent chart cache - charts never change once published
  private chartCache = new Map<string, Chart>();

  /**
   * Retrieves the latest chart directly from the new endpoint
   * @returns {Observable<Chart>} - An Observable of the latest chart
   */
  getLatestChart(chartType: ChartType): Observable<Chart> {
    const url = `${this.endpoints[chartType]}/latest`;
    return this.http.get<Chart>(url).pipe(
      catchError(this.handleError),
      tap((chart) => {
        // Extract the chart number and cache the result
        const chartNumber = +chart.no;
        const cacheKey = `${chartType}-${chartNumber}`;
        this.latestChartNumber.set(chartNumber);
        this.chartCache.set(cacheKey, chart);
        this.updateChartSignals(chart);
      }),
    );
  }

  /**
   * Retrieves the chart information for a given chart number.
   * @param {number} chartNumber - A number representing the weekly chart to retrieve.
   * @returns {Observable<Chart>} - An Observable of type Chart that contains information about the requested chart.
   */
  getChartByNumber(chartType: ChartType, chartNumber: number): Observable<Chart> {
    const cacheKey = `${chartType}-${chartNumber}`;
    // Check if we have this chart in cache - it never expires!
    if (this.chartCache.has(cacheKey)) {
      return new Observable<Chart>((observer) => {
        const cachedChart = this.chartCache.get(cacheKey)!;
        this.updateChartSignals(cachedChart);
        observer.next(cachedChart);
        observer.complete();
      });
    }

    // No cache hit, fetch from API
    const url = `${this.endpoints[chartType]}/${chartNumber}`;
    return this.http.get<Chart>(url).pipe(
      catchError(this.handleError),
      tap((response) => {
        // Cache the result permanently
        this.chartCache.set(cacheKey, response);
        this.updateChartSignals(response);
      }),
    );
  }

  /**
   * Update signals from chart data
   */
  private updateChartSignals(chart: Chart): void {
    // TODO: change from string (artist - title) to objects
    const chartItems = chart.results.mainChart.items.map((item) => `${item.artist} - ${item.name}`).reverse();
    this.latestChartText.set(chartItems);
    this.chart.set(chart);
  }

  /**
   * Error handler for HTTP requests
   * @param {HttpErrorResponse} error - The error response
   * @returns {Observable<never>} - Observable with error message
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    // console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
