import { Store } from '@optask/tasker';
import { Redis, RedisOptions } from 'ioredis';

export interface RedisStoreOptions extends RedisOptions {
  namespace: string;
}

export class RedisStore implements Store {
  private client: Redis;

  constructor(private readonly options: RedisStoreOptions) {}

  async has(key: string): Promise<boolean> {
    const newKey = this.getNamespacedKey(key);
    const client = this.getClient();

    const numTimes = await client.exists(newKey);
    return numTimes > 0;
  }

  async get(key: string): Promise<string | null> {
    const newKey = this.getNamespacedKey(key);
    const client = this.getClient();

    const data = await client.get(newKey);
    if (!data) {
      return null;
    }
    return data;
  }

  async set(key: string, data: string) {
    const newKey = this.getNamespacedKey(key);
    const client = this.getClient();

    await client.set(newKey, data);
  }

  getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(this.options);
    }
    return this.client;
  }

  private getNamespacedKey(key: string) {
    return `${this.options.namespace}:${key}`;
  }
}
