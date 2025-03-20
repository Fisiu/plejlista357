import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  /**
   * Retrieves an item from `localStorage` and parses it as an object of type T.
   *
   * @template T - The type of the object to parse from localStorage.
   * @param key - The key under which the item is stored in localStorage.
   * @returns The parsed object if successful, or null if the item does not exist or cannot be parsed.
   */
  getItemAsObject<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    if (item) {
      try {
        return JSON.parse(item) as T;
      } catch (error) {
        console.error(
          `Error parsing localStorage item with key "${key}":`,
          error,
        );
        return null;
      }
    }
    return null;
  }
}
