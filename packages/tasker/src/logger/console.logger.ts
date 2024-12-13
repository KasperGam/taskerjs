import { Logger } from '../types';

export class ConsoleLogger implements Logger {
  logLevel = 3;

  constructor() {
    const envVar = process.env[`TASKER_LOG_LEVEL`];
    const parsed = parseInt(envVar, 10);
    if (parsed >= 0) {
      this.logLevel = Math.min(parsed, 5);
    }
  }

  fatal(...args: any[]) {
    console.error(args);
  }
  error(...args: any[]) {
    if (this.logLevel >= 1) {
      console.error(args);
    }
  }
  warn(...args: any[]) {
    if (this.logLevel >= 2) {
      console.warn(args);
    }
  }
  info(...args: any[]) {
    if (this.logLevel >= 3) {
      console.info(args);
    }
  }
  log(...args: any[]) {
    if (this.logLevel >= 3) {
      console.log(args);
    }
  }
  debug(...args: any[]) {
    if (this.logLevel >= 4) {
      console.debug(args);
    }
  }
  trace(...args: any[]) {
    if (this.logLevel >= 5) {
      console.trace(args);
    }
  }
}
