import { Logger } from '../src/types';

export class TestLogger implements Logger {
  fatal() {}
  error() {}
  warn() {}
  info() {}
  log() {}
  debug() {}
  trace() {}
}
