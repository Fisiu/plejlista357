import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  filter,
  map,
  Observable,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { DebugLoggerService } from './debug-logger.service';
import { Chart, ChartSummary } from './radio-chart.model';

@Injectable({
  providedIn: 'root',
})
export class RadioChartService {
  private readonly debugLogger = inject(DebugLoggerService);
  private http = inject(HttpClient);

  baseUrl = 'https://wyniki.radio357.pl/api/charts';

  latestWeeklyChart = signal<Chart | undefined>(undefined);
  latestWeeklyChartText = signal<string[]>([]);
  latestWeeklyChartNumber = signal<number>(0);

  /**
   * Fetches all available chart summaries
   * @returns Observable of ChartSummary array
   */
  getAllChartSummaries(): Observable<ChartSummary[]> {
    const url = `${this.baseUrl}/lista/all`;
    return this.http
      .get<ChartSummary[]>(url)
      .pipe(catchError(this.handleError));
  }

  /**
   * Fetches the most recent chart
   * @returns Observable of Chart
   */
  getLatestChart(): Observable<string[]> {
    return this.getAllChartSummaries().pipe(
      // tap((response) => this.debugLogger.log(response)),
      map((summaries: ChartSummary[]) => summaries[0]?.no),
      filter((latestId: string): latestId is string => !!latestId),
      tap((latestId: string) => {
        this.latestWeeklyChartNumber.set(+latestId);
      }),
      switchMap((latestId: string) => this.getChartByIdAsText(latestId)),
      catchError(this.handleError),
    );
  }

  /**
   * Fetches a specific chart by ID
   * @param id Chart identifier
   * @returns Observable of Chart
   */
  private getChartById(id: string): Observable<Chart> {
    const url = `${this.baseUrl}/lista/${id}`;
    return this.http.get<Chart>(url).pipe(catchError(this.handleError));
  }

  /**
   * Fetches a specific chart by ID, and returns string array
   * @param id Chart identifier
   * @returns Observable of string array
   */
  private getChartByIdAsText(id: string): Observable<string[]> {
    return this.getChartById(id).pipe(
      tap((response) => this.latestWeeklyChart.set(response)),
      map((response: Chart) => {
        return response.results.mainChart.items
          .map((item) => `${item.artist} - ${item.name}`)
          .reverse();
      }),
      catchError(this.handleError),
    );
  }

  /**
   * Error handler for HTTP requests
   * @param error The error response
   * @returns Observable with error message
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
