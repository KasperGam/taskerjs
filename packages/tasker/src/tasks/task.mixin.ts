import { AnyCondition } from '../conditions';
import { Condition, Modifier, Task, TaskState } from '../types';

/**
 * A generic class that implements a run function
 */
interface RunnableClass {
  /**
   * A function to run this task. Can be async.
   * @param args Whatever arguments happen to be passed to the tasks
   */
  run: Task[`run`];
}

type TaskWrapperClass = { new (...args: any[]): RunnableClass };

/**
 * A mixin allowing other classes with a different inheritance chain to
 * also implement the Task interface.
 * @param BaseClass The class to wrap as a task
 * @returns A new class with the properties needed to be a task added.
 */
export const TaskMixin = (BaseClass: TaskWrapperClass) =>
  class extends BaseClass implements Task {
    name: string;
    condition: Condition<any>;
    dependsOn?: string[];
    state: TaskState = `idle`;
    modifiers: Modifier[];
    skippedReason?: string;

    constructor(...args: any[]) {
      super(args);
      this.name = Object.getPrototypeOf(this).name;
      this.condition = new AnyCondition(`any`);
      this.modifiers = [];
    }
  };
