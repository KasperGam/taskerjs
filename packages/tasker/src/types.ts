import { EventEmitter } from 'events';

/**
 * The states a task can be in.
 * - idle: The task has not been run, the scheduler is still planning phase
 * - skipped: If the task does not meet its condition or a modifier on the task marked it as skipped
 * - running: The task is currently running (set just before calling the task's run method)
 * - error: The task throw an error when running
 * - success: The task finished its run method without throwing
 */
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
  run: (args: string[]) => void | Promise<void>;
}

export type ConditionComparison<C> = (condition: C) => boolean;

/**
 * A condition is something that modifies when the task runs
 */
export interface Condition<C, V = C> {
  /**
   * The name of the condition, used to lookup the condition in the condition state
   * When adding conditions to the scheduler, the name is the key to find the registered
   * value. Note that the name is only symbolic if used with a compound condition, such as
   * AndCondition.
   */
  name: string;
  /**
   * The comparison function to see if the condition passes. Takes in the value of the condition
   * provided to the scheduler. Should return a boolean if the condition passes.
   */
  comparison: ConditionComparison<C>;
  /**
   * A more complex way to determine if the condition passes, used if the simple comparison function
   * above for a single condition is not enough to determine if the condition passes. Used mainly
   * for compound conditions like AndCondition.
   * @param state The entire state of all the conditions
   * @returns A boolean if the condition passes, false otherwise
   */
  compareFromState?: (state: Map<string, any>) => boolean;
  /**
   * For compound conditions, the scheduler can check that all of the needed sub-condition values
   * are present using this function.
   * If not provided, the conditions cannot be fetched from the store if they are missing when setting
   * `shouldLookupConditionsInStore` to true in the scheduler.
   * @returns A list of the names of the sub condition values if this condition is a compound condition.
   */
  getSubConditions?: () => string[];
  value: V;
}

/**
 * Interface for a storage mechanism, used for modifiers and optionally
 * to store condition state
 */
export interface Store {
  logger?: Logger;
  /**
   * Returns true if the store contains the given key, false otherwise
   * @param key The key to test if the store contains
   */
  has(key: string): boolean | Promise<boolean>;
  /**
   * Returns either null if the key does not exist in the store, otherwise
   * returns the string value
   * @param key The key to get the value for
   */
  get(key: string): string | Promise<string> | null | Promise<null>;
  /**
   * Will store the given data for the given key in the store
   * @param key The key
   * @param data The string to store
   */
  set(key: string, data: string): void | Promise<void>;
}

/**
 * Data passed to modifier functions
 */
export type ModifierArgs<T extends Task = Task> = {
  /**
   * The current conditions the task is running under
   */
  conditionState: Map<string, any>;
  /**
   * The task that the modifier is applied to
   */
  task: T;
  /**
   * A reference to the shared store
   */
  store: Store;
};

/**
 * Interface defining a modifier, which allows modification to the way
 * tasks run.
 *
 * Before a task is run by the task runner, it must call `shouldTaskRun`
 * which allows the modifier to determine if the task should run.
 *
 * The modifier call back `taskWillRun` is called after `shouldTaskRun`
 * if the task is about to run.
 *
 * Finally, after the task runs, whether it ran into an error or not,
 * the `taskDidRun` callback is called. You can access the task state
 * with args.task.state.
 */
export interface Modifier<T extends Task = Task> {
  logger?: Logger;
  /**
   * Called before any other modifier callback to determine if the task
   * should be run. Allows the modifier to mark the task as skipped if
   * this method returns false.
   * @returns True if the task should run, false if it should be skipped
   */
  shouldTaskRun?: (args: ModifierArgs<T>) => boolean | Promise<boolean>;
  /**
   * Called right before running the task, allows for modification of
   * the task if needed.
   */
  taskWillRun?: (args: ModifierArgs<T>) => void | Promise<void>;
  taskDidRun?: (args: ModifierArgs<T>) => void | Promise<void>;
}

/**
 * The state of the task scheduler
 */
export type SchedulerState = `planning` | `running` | `error` | `finished`;

/**
 * The scheduler runner type
 * - serial: Uses the sync task runner which runs tasks one at a time
 * - parallel: Uses the parallel task runner which runs tasks in parallel
 * - custom: A custom runner was registered using registerTaskRunnerProvider
 */
export type SchedulerTaskRunnerType = `serial` | `parallel` | `custom`;

/**
 * Internal type for task runners to help type hints for the event emitter
 */
export type TaskRunnerEventMap = {
  error: Error[];
  done: Task[][];
  taskComplete: Task[];
};

/**
 * A class that can run tasks and report back the progress being made for each task.
 * Will emit a `done` event when all tasks have run, and and `error` event if
 * a task throws.
 */
export interface TaskRunner extends EventEmitter<TaskRunnerEventMap> {
  /**
   * Starts the task runner, which should run all of the tasks scheduled in the task
   * scheduler.
   * @param args The command line args passed to the process, all tasks are passed
   * these args in the run command.
   */
  start: (args: string[]) => void | Promise<void>;
  /**
   * Get the currently running tasks
   */
  getRunningTasks: () => Task[];
  /**
   * Get the completed tasks
   */
  getCompletedTasks: () => Task[];
}

/**
 * Task runners are constructed by a TaskRunnerProvider that is registered with the scheduler.
 * The default is just a constructor for the SyncTaskRunner.
 *
 * Must return a new instance of a task runner that will run the given tasks. Task runners
 * must handle task state and task modifier callbacks.
 * Note that the provided tasks are in order based on dependencies using a topological sort
 * from the task dependency resolver.
 *
 * The state is the full state of the conditions registered with the scheduler/store.
 */
export interface TaskRunnerProvider {
  /**
   * Must return a new instance of a task runner that will run the given tasks. Task runners
   * must handle task state and task modifier callbacks.
   * Note that the provided tasks are in order based on dependencies using a topological sort
   * from the task dependency resolver.
   *
   * The state is the full state of the conditions registered with the scheduler/store.
   *
   * @returns a new instance that conforms to the TaskRunner interface.
   */
  getTaskRunner: (
    tasks: Task[],
    state: Map<string, any>,
    logger: Logger,
    store?: Store,
  ) => TaskRunner;
}

type LogMethod = (...args: any[]) => void;

/**
 * Defines interface for a logger like pino or winston to implement
 */
export interface Logger {
  fatal: LogMethod;
  error: LogMethod;
  warn: LogMethod;
  info: LogMethod;
  log?: LogMethod;
  debug: LogMethod;
  trace: LogMethod;

  child?: (name?: string) => Logger;
}
