import { Store } from '../types';
import path from 'path';
import fs from 'fs/promises';

/**
 * A store that will manage files in the local file system to store information
 */
export class FileSystemStore implements Store {
  constructor(private readonly basePath?: string) {}

  async has(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);

    const data = await fs.stat(fullPath);

    if (data.isFile()) {
      return true;
    } else {
      return false;
    }
  }
  async get(key: string): Promise<string | null> {
    const fullPath = this.getFullPath(key);

    try {
      const data = await fs.readFile(fullPath, `utf-8`);
      return data;
    } catch (e) {
      console.error(
        `Error reading file at ${fullPath}: ${e instanceof Error ? e.message : e}`,
      );
      return null;
    }
  }

  async set(key: string, data: string) {
    const fullPath = this.getFullPath(key);

    await fs.writeFile(fullPath, data, `utf-8`);
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
