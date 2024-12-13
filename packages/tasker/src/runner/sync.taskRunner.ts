import { Logger, Store, Task, TaskRunner, TaskRunnerEventMap } from '../types';
import { EventEmitter } from 'events';
import {
  notifyDidRunTask,
  notifyWillRunTask,
  shouldRunTask,
} from './taskRunner.utils';
import { ConsoleLogger } from '../logger/console.logger';

/**
 * The most basic implementation of a task runner- will just run the provided tasks
 * one after the other synchronously.
 * If any task throws, will re-throw that error.
 */
export class SyncTaskRunner
  extends EventEmitter<TaskRunnerEventMap>
  implements TaskRunner
{
  logger: Logger = new ConsoleLogger();

  private readonly completedTasks: Task[] = [];
  constructor(
    private readonly tasks: Task[],
    private readonly conditionState: Map<string, any>,
    private readonly store: Store,
    logger: Logger,
  ) {
    super();
    this.logger = logger;
  }

  async start(args: string[]) {
    this.logger.trace(
      `Sync task runner started with ${this.tasks.length} tasks. Runtime args: ${JSON.stringify(args)}`,
    );
    for (const task of this.tasks) {
      const modifierArgs = {
        task,
        conditionState: this.conditionState,
        store: this.store,
      };
      try {
        // Check if we should skip the task
        this.logger.trace(`Calling shouldRunTask for ${task.name}`);
        const shouldRun = await shouldRunTask(modifierArgs);
        // Skip the task
        if (!shouldRun) {
          task.state = `skipped`;
          task.skippedReason = `Due to modifiers`;
          this.logger.info(`Task ${task.name} skipped due to modifiers`);
          continue;
        }

        // Run the task
        this.logger.trace(`Calling willRunTask for ${task.name}`);
        await notifyWillRunTask(modifierArgs);
        task.state = `running`;
        this.logger.debug(`Running task ${task.name}`);
        await task.run(args);
        task.state = `success`;
        this.logger.debug(`Task finished successfully: ${task.name}`);
        this.logger.trace(`Calling notify did run task: ${task.name}`);
        await notifyDidRunTask(modifierArgs);
        this.completedTasks.push(task);
        this.emit(`taskComplete`, task);
      } catch (e) {
        this.logger.error(
          `Error occurred running task ${task.name}: ${e.message}`,
        );
        task.state = `error`;
        this.logger.trace(`Calling didRunTask for ${task.name}`);
        await notifyDidRunTask(modifierArgs);
        this.emit(`error`, e);
        throw e;
      }
    }
    this.logger.debug(`Task runner done running tasks`);
    this.emit(`done`, this.completedTasks);
  }

  getRunningTasks() {
    return this.completedTasks.length > 0 ? [] : this.tasks;
  }

  getCompletedTasks() {
    return this.completedTasks;
  }
}
