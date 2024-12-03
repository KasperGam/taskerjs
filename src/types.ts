import { EventEmitter } from 'events';

/**
 * A definition of a tasker task that can be run by the tasker scheduler
 */
export interface Task {
  /**
   * The name of the task -required
   * This is how the task is registered and referred to
   */
  name: string;
  /**
   * The condition this task should run under
   */
  condition: Condition<any>;
  /**
   * Array of tasks this task depends on- those tasks will be run before this one
   * Will throw an error at runtime if the dependant tasks are not found
   */
  dependsOn?: string[];
  /**
   * A function to run this task. Can be async.
   * @param args Whatever arguments happen to be passed to the tasks
   */
  run: (args: any[]) => void | Promise<void>;
}

export type ConditionComparison<C> = (condition: C) => boolean;

export interface Condition<C, V = C> {
  name: string;
  comparison: ConditionComparison<C>;
  compareFromState?: (state: Map<string, any>) => boolean;
  value: V;
}

export type SchedulerState = `planning` | `running` | `error` | `finished`;

export type TaskRunnerEvents = {
  error: Error;
  done: undefined;
};

export type TaskRunnerEventMap = {
  error: Error[];
  done: Task[][];
};

export interface TaskRunner extends EventEmitter<TaskRunnerEventMap> {
  start: (args: any[]) => void | Promise<void>;
  getRunningTasks: () => Task[];
  getCompletedTasks: () => Task[];
}

export interface TaskRunnerProvider {
  getTaskRunner: (tasks: Task[]) => TaskRunner;
}
