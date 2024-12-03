import { Task, TaskRunner, TaskRunnerEventMap } from '../types';
import { EventEmitter } from 'events';

/**
 * The most basic implementation of a task runner- will just run the provided tasks
 * one after the other synchronously.
 * If any task throws, will re-throw that error.
 */
export class SyncTaskRunner
  extends EventEmitter<TaskRunnerEventMap>
  implements TaskRunner
{
  private readonly completedTasks: Task[] = [];
  constructor(private readonly tasks: Task[]) {
    super();
  }

  async start(args: any[]) {
    for (const task of this.tasks) {
      try {
        await task.run(args);
        this.completedTasks.push(task);
      } catch (e) {
        console.error(`Error occurred running task ${task.name}: ${e.message}`);
        this.emit(`error`, e);
        throw e;
      }
    }
    this.emit(`done`, this.completedTasks);
  }

  getRunningTasks() {
    return this.completedTasks.length > 0 ? [] : this.tasks;
  }

  getCompletedTasks() {
    return this.completedTasks;
  }
}
