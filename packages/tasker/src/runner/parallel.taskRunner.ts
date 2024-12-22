import { Logger, Store, Task, TaskRunner, TaskRunnerEventMap } from '../types';
import { EventEmitter } from 'events';
import { setTimeout } from 'timers/promises';
import {
  notifyDidRunTask,
  notifyWillRunTask,
  shouldRunTask,
} from './taskRunner.utils';
import AsyncLock from 'async-lock';
import { ConsoleLogger } from '../logger/console.logger';

export class ParallelTaskRunner
  extends EventEmitter<TaskRunnerEventMap>
  implements TaskRunner
{
  private readonly completedTasks: Task[] = [];
  private lock = new AsyncLock();

  private args: string[] = [];

  private workers: Promise<string>[] = [];

  logger: Logger = new ConsoleLogger();

  private readonly taskLock = `task_lock`;
  constructor(
    private readonly tasks: Task[],
    private readonly conditionState: Map<string, any>,
    private readonly store: Store,
    private readonly parallelCount: number = 4,
    private readonly processorTick: number = 100,
    logger: Logger,
  ) {
    super();
    this.logger = logger;

    this.logger.debug(`Creating ${this.parallelCount} processing queues`);
    for (let i = 0; i < this.parallelCount; i++) {
      this.workers.push(this.createTaskProcessor(`Processor ${i + 1}`));
    }
  }

  async start(args: string[]) {
    this.args = args;
    this.logger.trace(`Starting task runner`);

    await Promise.allSettled(this.workers);
    this.emit(`done`, this.completedTasks);
  }

  private createTaskProcessor(name: string) {
    const processor = async () => {
      while (this.tasks.filter((task) => task.state === `idle`).length > 0) {
        const resolvedTask = await this.lock.acquire(
          this.taskLock,
          async () => {
            try {
              const task = await this.getNextTask();
              if (task) {
                this.logger.trace(`Calling willRunTask for ${task.name}`);
                await notifyWillRunTask({
                  task,
                  conditionState: this.conditionState,
                  store: this.store,
                });
                task.state = `running`;
                return task;
              } else {
                return undefined;
              }
            } catch {
              return undefined;
            }
          },
        );

        if (resolvedTask) {
          try {
            this.logger.debug(
              `Task processing on queue ${name}: ${resolvedTask.name}`,
            );
            await resolvedTask.run(this.args);
            resolvedTask.state = `success`;
            this.logger.debug(
              `Task finished successfully on queue ${name}: ${resolvedTask.name}`,
            );
            this.logger.trace(`Calling didRunTask for ${resolvedTask.name}`);
            await notifyDidRunTask({
              task: resolvedTask,
              conditionState: this.conditionState,
              store: this.store,
            });
            this.completedTasks.push(resolvedTask);
            this.emit(`taskComplete`, resolvedTask);
          } catch (error) {
            resolvedTask.state = `error`;
            this.logger.debug(
              `Task threw on queue ${name}: ${resolvedTask.name}`,
            );
            this.logger.trace(`Calling didRunTask for ${resolvedTask.name}`);
            await notifyDidRunTask({
              task: resolvedTask,
              conditionState: this.conditionState,
              store: this.store,
            });
            this.emit(`error`, error);
          }
        } else {
          this.logger.debug(
            `Queue ${name} found no tasks, will re-try in ${this.processorTick}ms`,
          );
          await setTimeout(this.processorTick);
        }
      }

      this.logger.debug(`Queue ${name} finished processing.`);
      return `done`;
    };

    return processor();
  }

  private async getNextTask(): Promise<Task | undefined> {
    const remainingTasks = this.tasks.filter((task) => task.state === `idle`);

    for (const task of remainingTasks) {
      const dependencies = (task.dependsOn ?? [])
        .map((dep) => this.tasks.find((_task) => _task.name === dep))
        .filter((depTask) => !!depTask);

      let allDepsDone = true;
      for (const dep of dependencies) {
        if (dep.state === `error`) {
          task.state = `skipped`;
          allDepsDone = false;
          this.logger.info(
            `Task ${task.name} not running due to failed dependencies:`,
            dependencies
              .filter((_dep) => _dep.state === `error`)
              .map((_dep) => _dep.name),
          );
          break;
        } else if (dep.state === `idle` || dep.state === `running`) {
          allDepsDone = false;
          this.logger.debug(
            `Task ${task.name} not ready due to pending dependency ${dep.name}`,
          );
        }
      }

      if (allDepsDone) {
        this.logger.trace(`Calling shouldRunTask for ${task.name}`);
        const shouldRun = await shouldRunTask({
          task,
          conditionState: this.conditionState,
          store: this.store,
        });
        if (!shouldRun) {
          task.state = `skipped`;
          task.skippedReason = `Due to modifiers`;
          this.logger.info(`Task ${task.name} skipped due to modifiers`);
        } else {
          return task;
        }
      }
    }

    return undefined;
  }

  getRunningTasks() {
    return this.tasks.filter((task) => task.state === `running`);
  }

  getCompletedTasks() {
    return this.completedTasks;
  }
}
