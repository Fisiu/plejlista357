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
        console.error(`Error parsing localStorage item with key "${key}":`, error);
        return null;
      }
    }
    return null;
  }

  /**
   * Retrieves a raw string item from `localStorage`.
   *
   * @param key - The key under which the item is stored in localStorage.
   * @returns The stored string, or null if not found.
   */
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  /**
   * Stores a serializable object in `localStorage` as a JSON string.
   *
   * @param key - The key to store the item under.
   * @param value - The object to serialize and store.
   */
  setItemAsObject(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Stores a raw string value in `localStorage`.
   *
   * @param key - The key to store the item under.
   * @param value - The string value to store.
   */
  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  /**
   * Removes an item from `localStorage`.
   *
   * @param key - The key of the item to remove.
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}
