import { Task, TaskRunnerProvider } from '../types';
import { SyncTaskRunner } from './sync.taskRunner';

export class SyncTaskRunnerProvider implements TaskRunnerProvider {
  getTaskRunner(tasks: Task[]): SyncTaskRunner {
    return new SyncTaskRunner(tasks);
  }
}
