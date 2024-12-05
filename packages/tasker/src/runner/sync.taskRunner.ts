import { Store, Task, TaskRunner, TaskRunnerEventMap } from '../types';
import { EventEmitter } from 'events';
import {
  notifyDidRunTask,
  notifyWillRunTask,
  shouldRunTask,
} from './taskRunner.utils';

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
  constructor(
    private readonly tasks: Task[],
    private readonly conditionState: Map<string, any>,
    private readonly store: Store,
  ) {
    super();
  }

  async start(args: string[]) {
    for (const task of this.tasks) {
      const modifierArgs = {
        task,
        conditionState: this.conditionState,
        store: this.store,
      };
      try {
        // Check if we should skip the task
        const shouldRun = await shouldRunTask(modifierArgs);
        // Skip the task
        if (!shouldRun) {
          task.state = `skipped`;
          task.skippedReason = `Due to modifiers`;
          continue;
        }

        // Run the task
        await notifyWillRunTask(modifierArgs);
        task.state = `running`;
        await task.run(args);
        task.state = `success`;
        await notifyDidRunTask(modifierArgs);
        this.completedTasks.push(task);
      } catch (e) {
        console.error(`Error occurred running task ${task.name}: ${e.message}`);
        task.state = `error`;
        await notifyDidRunTask(modifierArgs);
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
