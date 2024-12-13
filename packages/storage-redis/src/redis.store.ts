import { ConsoleLogger, Logger, Store } from '@optask/tasker';
import { Redis, RedisOptions } from 'ioredis';

export interface RedisStoreOptions extends RedisOptions {
  namespace: string;
}

export class RedisStore implements Store {
  private client: Redis;
  logger: Logger = new ConsoleLogger();

  constructor(private readonly options: RedisStoreOptions) {}

  async has(key: string): Promise<boolean> {
    this.logger.trace(
      `Testing if key ${key} exists in store in namespace ${this.options.namespace}`,
    );
    const newKey = this.getNamespacedKey(key);
    const client = this.getClient();

    const numTimes = await client.exists(newKey);
    const hasKey = numTimes > 0;
    this.logger.debug(
      `Key ${newKey} ${hasKey ? 'exists' : 'does not exist'} in the store`,
    );
    return hasKey;
  }

  async get(key: string): Promise<string | null> {
    this.logger.trace(
      `Fetching key ${key} from store in namespace ${this.options.namespace}`,
    );
    const newKey = this.getNamespacedKey(key);
    const client = this.getClient();

    const data = await client.get(newKey);
    if (!data) {
      this.logger.debug(`Key ${newKey} not found in store`);
      return null;
    }
    this.logger.debug(`Key ${newKey} fetched in store with data ${data}`);
    return data;
  }

  async set(key: string, data: string) {
    this.logger.trace(
      `Set key ${key} with data ${data} in store with namespace ${this.options.namespace}`,
    );
    const newKey = this.getNamespacedKey(key);
    const client = this.getClient();

    await client.set(newKey, data);
    this.logger.debug(`Set key ${newKey} with data ${data} in store`);
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
