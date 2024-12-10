import { Store, Task, TaskRunner, TaskRunnerEventMap } from '../types';
import { EventEmitter } from 'events';
import { setTimeout } from 'timers/promises';
import {
  notifyDidRunTask,
  notifyWillRunTask,
  shouldRunTask,
} from './taskRunner.utils';
import AsyncLock from 'async-lock';

export class ParallelTaskRunner
  extends EventEmitter<TaskRunnerEventMap>
  implements TaskRunner
{
  private readonly completedTasks: Task[] = [];
  private lock = new AsyncLock();

  private args: string[] = [];

  private workers: Promise<string>[] = [];

  private readonly taskLock = `task_lock`;
  constructor(
    private readonly tasks: Task[],
    private readonly conditionState: Map<string, any>,
    private readonly store: Store,
    private readonly parallelCount: number = 4,
    private readonly processorTick: number = 100,
  ) {
    super();

    for (let i = 0; i < this.parallelCount; i++) {
      this.workers.push(this.createTaskProcessor(`Processor ${i + 1}`));
    }
  }

  async start(args: string[]) {
    this.args = args;

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
            console.log(`${name}: Processing task ${resolvedTask.name}`);
            await resolvedTask.run(this.args);
            resolvedTask.state = `success`;
            await notifyDidRunTask({
              task: resolvedTask,
              conditionState: this.conditionState,
              store: this.store,
            });
            this.completedTasks.push(resolvedTask);
            this.emit(`taskComplete`, resolvedTask);
          } catch (error) {
            resolvedTask.state = `error`;
            await notifyDidRunTask({
              task: resolvedTask,
              conditionState: this.conditionState,
              store: this.store,
            });
            this.emit(`error`, error);
          }
        } else {
          await setTimeout(this.processorTick);
        }
      }

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
          task.state === `error`;
          allDepsDone = false;
          break;
        } else if (dep.state === `idle` || dep.state === `running`) {
          allDepsDone = false;
        }
      }

      if (allDepsDone) {
        const shouldRun = await shouldRunTask({
          task,
          conditionState: this.conditionState,
          store: this.store,
        });
        if (!shouldRun) {
          task.state = `skipped`;
          task.skippedReason = `Due to modifiers`;
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
