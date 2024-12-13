import { Logger as NativeNestLogger } from '@nestjs/common';
import { Logger } from '@optask/tasker';

/**
 * Simple wrapper around the nestjs default logger, implementing the logger interface
 */
export class NestLogger implements Logger {
  logLevel = 3;

  private logger: NativeNestLogger;

  constructor(
    name?: string,
    options?: {
      timestamp?: boolean;
    },
  ) {
    if (name) {
      this.logger = new NativeNestLogger(name, options);
    } else {
      this.logger = new NativeNestLogger();
    }

    const envVar = process.env[`TASKER_LOG_LEVEL`];
    const parsed = parseInt(envVar, 10);
    if (parsed >= 0) {
      this.logLevel = Math.min(parsed, 5);
    }
  }

  fatal(...args: any[]) {
    if (this.logLevel >= 0) {
      this.logger.fatal(args);
    }
  }

  error(...args: any[]) {
    if (this.logLevel >= 1) {
      this.logger.error(args);
    }
  }

  warn(...args: any[]) {
    if (this.logLevel >= 2) {
      this.logger.warn(args);
    }
  }

  log(...args: any[]) {
    if (this.logLevel >= 3) {
      this.logger.log(args);
    }
  }

  info(...args: any[]) {
    if (this.logLevel >= 3) {
      this.logger.log(args);
    }
  }

  debug(...args: any[]) {
    if (this.logLevel >= 4) {
      this.logger.debug(args);
    }
  }

  trace(...args: any[]) {
    if (this.logLevel >= 5) {
      this.logger.verbose(args);
    }
  }

  // Construct new logger with a different name
  child(name?: string) {
    const newLogger = new NestLogger(name);
    newLogger.logLevel = this.logLevel;
    return newLogger;
  }
}
