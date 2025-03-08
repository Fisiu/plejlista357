import { Injectable, isDevMode } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DebugLoggerService {
  private isDebugMode: boolean;

  constructor() {
    this.isDebugMode = isDevMode();
  }

  /**
   * Logs messages to the console only when running in development mode
   * @param message The message to log
   * @param optionalParams Additional parameters to log
   */
  log(message?: unknown, ...optionalParams: unknown[]): void {
    if (this.isDebugMode) {
      console.log(message, ...optionalParams);
    }
  }

  /**
   * Logs warning messages to the console only when running in development mode
   * @param message The warning message to log
   * @param optionalParams Additional parameters to log
   */
  warn(message?: unknown, ...optionalParams: unknown[]): void {
    if (this.isDebugMode) {
      console.warn(message, ...optionalParams);
    }
  }

  /**
   * Logs error messages to the console only when running in development mode
   * @param message The error message to log
   * @param optionalParams Additional parameters to log
   */
  error(message?: unknown, ...optionalParams: unknown[]): void {
    if (this.isDebugMode) {
      console.error(message, ...optionalParams);
    }
  }
}
