import { Store, Task, TaskRunnerProvider } from '../types';
import { SyncTaskRunner } from './sync.taskRunner';

export class SyncTaskRunnerProvider implements TaskRunnerProvider {
  getTaskRunner(
    tasks: Task[],
    conditionState: Map<string, any>,
    store: Store,
  ): SyncTaskRunner {
    return new SyncTaskRunner(tasks, conditionState, store);
  }
}
