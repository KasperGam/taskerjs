import { Logger, Store, Task, TaskRunnerProvider } from '../types';
import { ParallelTaskRunner } from './parallel.taskRunner';

export class ParallelTaskRunnerProvider implements TaskRunnerProvider {
  pollInterval: number = 100;
  parallelCount: number = 4;

  getTaskRunner(
    tasks: Task[],
    conditionState: Map<string, any>,
    logger: Logger,
    store: Store,
  ): ParallelTaskRunner {
    const childLogger = logger.child?.(ParallelTaskRunner.name) ?? logger;
    return new ParallelTaskRunner(
      tasks,
      conditionState,
      store,
      this.parallelCount,
      this.pollInterval,
      childLogger,
    );
  }
}
