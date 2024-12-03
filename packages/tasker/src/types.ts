import { EventEmitter } from 'events';

export type TaskState = `idle` | `skipped` | `running` | `error` | `success`;

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
   * A list of modifiers that modify how the task runs or can execute code before or after it runs
   */
  modifiers: Modifier[];

  /**
   * If the task was skipped
   */
  state: TaskState;

  /**
   * An explanation as to why the task was skipped, if needed
   */
  skippedReason?: string;
  /**
   * A function to run this task. Can be async.
   * @param args Whatever arguments happen to be passed to the tasks
   */
  run: (args: any[]) => void | Promise<void>;
}

export type ConditionComparison<C> = (condition: C) => boolean;

/**
 * A condition is something that modifies when the task runs
 */
export interface Condition<C, V = C> {
  name: string;
  comparison: ConditionComparison<C>;
  compareFromState?: (state: Map<string, any>) => boolean;
  value: V;
}

/**
 * Interface for a storage mechanism, used for modifiers
 */
export interface Store {
  has(key: string): boolean | Promise<boolean>;
  get(key: string): string | Promise<string> | null | Promise<null>;
  set(key: string, data: string): void | Promise<void>;
}

export type ModifierArgs = {
  conditionState: Map<string, any>;
  task: Task;
  store: Store;
};

export interface Modifier {
  shouldTaskRun?: (args: ModifierArgs) => boolean | Promise<boolean>;
  taskWillRun?: (args: ModifierArgs) => void | Promise<void>;
  taskDidRun?: (args: ModifierArgs) => void | Promise<void>;
}

/**
 * The state of the task scheduler
 */
export type SchedulerState = `planning` | `running` | `error` | `finished`;

export type TaskRunnerEvents = {
  error: Error;
  done: undefined;
};

export type TaskRunnerEventMap = {
  error: Error[];
  done: Task[][];
};

/**
 * A class that can run tasks and report back the progress being made for each task
 */
export interface TaskRunner extends EventEmitter<TaskRunnerEventMap> {
  start: (args: any[]) => void | Promise<void>;
  getRunningTasks: () => Task[];
  getCompletedTasks: () => Task[];
}

export interface TaskRunnerProvider {
  getTaskRunner: (
    tasks: Task[],
    state: Map<string, any>,
    store?: Store,
  ) => TaskRunner;
}
