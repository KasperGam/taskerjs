import { Store, Task, TaskRunnerProvider } from '../types';
import { ParallelTaskRunner } from './parallel.taskRunner';

export class ParallelTaskRunnerProvider implements TaskRunnerProvider {
  pollInterval: number = 100;
  parallelCount: number = 4;

  getTaskRunner(
    tasks: Task[],
    conditionState: Map<string, any>,
    store: Store,
  ): ParallelTaskRunner {
    return new ParallelTaskRunner(
      tasks,
      conditionState,
      store,
      this.parallelCount,
      this.pollInterval,
    );
  }
}
