import { Logger as NativeNestLogger } from '@nestjs/common';
import { Logger } from '@optask/tasker';

/**
 * Simple wrapper around the nestjs default logger, implementing the logger interface
 */
export class NestLogger extends NativeNestLogger implements Logger {
  info(...args: any[]) {
    // Just map calls to info -> log
    this.log(args);
  }

  trace(...args: any[]) {
    // Just map calls to trace -> verbose
    this.verbose(args);
  }

  // Construct new logger with a different name
  child(name?: string) {
    return new NestLogger(name);
  }
}
