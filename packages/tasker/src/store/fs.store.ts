import { Logger, Store } from '../types';
import path from 'path';
import fs from 'fs/promises';
import { ConsoleLogger } from '../logger/console.logger';

/**
 * A store that will manage files in the local file system to store information
 */
export class FileSystemStore implements Store {
  logger: Logger = new ConsoleLogger();
  constructor(private readonly basePath?: string) {}

  async has(key: string): Promise<boolean> {
    this.logger.trace(`Testing if key ${key} exists in store`);
    const fullPath = this.getFullPath(key);

    const data = await fs.stat(fullPath);

    if (data.isFile()) {
      this.logger.debug(`Key ${key} exists in store, full path: ${fullPath}`);
      return true;
    } else {
      return false;
    }
  }
  async get(key: string): Promise<string | null> {
    this.logger.trace(`Getting key ${key} in store`);
    const fullPath = this.getFullPath(key);

    try {
      const data = await fs.readFile(fullPath, `utf-8`);
      this.logger.debug(
        `Fetched key ${key} in store at path ${fullPath}. Data: ${data}`,
      );
      return data;
    } catch (e) {
      this.logger.error(
        `Error reading file at ${fullPath}: ${e instanceof Error ? e.message : e}`,
      );
      return null;
    }
  }

  async set(key: string, data: string) {
    this.logger.trace(`Set key ${key} in store with data ${data}`);
    const fullPath = this.getFullPath(key);

    try {
      await fs.writeFile(fullPath, data, `utf-8`);
      this.logger.debug(
        `Set key ${key} in store with data ${data}, full path ${fullPath}`,
      );
    } catch (error) {
      this.logger.error(
        `Something went wrong writing key ${key} with data ${data} to store!`,
        error,
      );
    }
  }

  private getFullPath(key: string): string {
    const basePath = key.replace(`_`, path.sep);
    const file = path.basename(basePath) + `.json`;

    const parts = [path.dirname(basePath), file];
    if (this.basePath) {
      parts.unshift(this.basePath);
    }
    if (basePath.startsWith(`./`)) {
      parts.unshift(process.cwd());
    }

    const fullPath = path.join(...parts);

    return fullPath;
  }
}
