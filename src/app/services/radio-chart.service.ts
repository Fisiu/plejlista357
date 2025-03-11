import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, delay, map, Observable, tap, throwError } from 'rxjs';
import { Chart, ChartSummary } from './radio-chart.model';

@Injectable({
  providedIn: 'root',
})
export class RadioChartService {
  private http = inject(HttpClient);

  baseUrl = 'https://wyniki.radio357.pl/api/charts';

  latestWeeklyChartNumber = signal<number>(0);
  weeklyChart = signal<Chart | undefined>(undefined);
  latestWeeklyChartText = signal<string[]>([]);

  /**
   * Retrieves the chart number for the latest chart.
   * @returns {Observable<number>} - An Observable of a number representing the chart number.
   */
  getLatestChartNumber(): Observable<number> {
    return this.getAllChartSummaries().pipe(
      catchError(this.handleError),
      map((response: ChartSummary[]) => +response[0]?.no),
      tap((num) => this.latestWeeklyChartNumber.set(num)),
    );
  }

  /**
   * Retrieves the chart information for a given chart number.
   * @param {number} chartNumber - A number representing the weekly chart to retrieve.
   * @returns {Observable<Chart>} - An Observable of type Chart that contains information about the requested chart.
   */
  getChartByNumber(chartNumber: number): Observable<Chart> {
    const url = `${this.baseUrl}/lista/${chartNumber}`;
    return this.http.get<Chart>(url).pipe(
      catchError(this.handleError),
      tap((response) => {
        const chart = response.results.mainChart.items
          .map((item) => `${item.artist} - ${item.name}`)
          .reverse();
        this.latestWeeklyChartText.set(chart);
      }),
      tap((response) => this.weeklyChart.set(response)),
    );
  }
  /**
   * Retrieves all available chart summaries
   * @returns {Observable<ChartSummary[]} - Observable of ChartSummary array
   */
  private getAllChartSummaries(): Observable<ChartSummary[]> {
    const url = `${this.baseUrl}/lista/all`;
    return this.http
      .get<ChartSummary[]>(url)
      .pipe(delay(2000), catchError(this.handleError));
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
