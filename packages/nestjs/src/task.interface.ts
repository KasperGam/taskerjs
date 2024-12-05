import {
  Condition,
  Modifier,
  BaseTask as TaskerBaseTask,
  TaskState,
} from '@optask/tasker';
import { TaskMetaKey } from './constants';

/**
 * A base class that all tasks should extend. You should
 * annotate your task with "@Task" and extend this base class
 * in order to register tasks to run on the tasker scheduler.
 *
 * An example usage would look like this:
 *
 * @example
 * ```
 * import { Task, BaseTask } from '@optask/nestjs';
 *
 * @Task({name: "My Task"})
 * export class MyTask extends BaseTask {
 *
 *   run() {
 *     console.log("Hello world!");
 *   }
 *
 * }
 * ```
 */
export abstract class BaseTask extends TaskerBaseTask {
  name: string;
  condition: Condition<any, any>;
  dependsOn?: string[];
  state: TaskState;
  modifiers: Modifier[];
  skippedReason?: string;
  abstract run(args: string[]): void;

  constructor() {
    super({ name: `BaseTask` });
    const taskMetadata = Reflect.getMetadata(
      TaskMetaKey,
      this.constructor,
    ) as TaskMetadata;
    if (!taskMetadata) {
      throw new Error(`Must be decorated with the @Task decorator!`);
    }

    this.name = taskMetadata.name;
    if (taskMetadata.condition) {
      this.condition = taskMetadata.condition;
    }
    if (taskMetadata.dependsOn) {
      this.dependsOn = taskMetadata.dependsOn;
    }
    if (taskMetadata.modifiers) {
      this.modifiers = taskMetadata.modifiers;
    }
  }
}

export interface TaskMetadata {
  name: string;
  condition?: Condition<any, any>;
  dependsOn?: string[];
  modifiers?: Modifier[];
}
