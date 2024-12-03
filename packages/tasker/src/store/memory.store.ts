import { Store } from '../types';

/**
 * An in-memory storage only useful for testing- not designed for general usage!!!
 */
export class InMemoryStore implements Store {
  private readonly store: Map<string, string> = new Map();

  has(key: string) {
    return this.store.has(key);
  }

  get(key: string) {
    return this.store.get(key) ?? null;
  }

  set(key: string, data: string) {
    this.store.set(key, data);
  }
}
