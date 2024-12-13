import { Logger, Store, Task, TaskRunnerProvider } from '../types';
import { SyncTaskRunner } from './sync.taskRunner';

export class SyncTaskRunnerProvider implements TaskRunnerProvider {
  getTaskRunner(
    tasks: Task[],
    conditionState: Map<string, any>,
    logger: Logger,
    store: Store,
  ): SyncTaskRunner {
    const childLogger = logger.child?.(SyncTaskRunner.name) ?? logger;
    return new SyncTaskRunner(tasks, conditionState, store, childLogger);
  }
}
