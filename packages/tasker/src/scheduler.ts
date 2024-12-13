import { ConsoleLogger } from './logger/console.logger';
import { DependencyResolver } from './resolver/dependency.resolver';
import { SyncTaskRunnerProvider } from './runner/sync.taskRunnerProvider';
import { InMemoryStore } from './store/memory.store';
import {
  Logger,
  SchedulerState,
  Store,
  Task,
  TaskRunner,
  TaskRunnerProvider,
} from './types';

/**
 * The scheduler for all tasks, this is the main class to register new tasks with and
 * condition variables.
 */
export class TaskScheduler {
  // Holds onto the tasks that were registered and
  private readonly taskRegistry: Map<string, Task> = new Map();
  // Resolves dependencies and sorts tasks based on them
  private readonly dependencyResolver = new DependencyResolver();

  // Provides an implementation of the task runner
  private taskRunnerProvider: TaskRunnerProvider = new SyncTaskRunnerProvider();

  // Holds onto the current scheduling conditions, such as version or date conditions
  private readonly conditionState: Map<string, any> = new Map();

  // Logger implementation
  private logger: Logger = new ConsoleLogger();

  // Hold onto scheduler state
  private state: SchedulerState = `planning`;
  private runner: TaskRunner | null = null;
  private store: Store = new InMemoryStore();

  public shouldLookupConditionsInStore: boolean = false;

  getState(): SchedulerState {
    return this.state;
  }

  getStore(): Store {
    return this.store;
  }

  /**
   * Overrides the default logger
   * The default logger is a simple wrapper around the console
   * @param logger The logger to use
   */
  setLogger(logger: Logger) {
    this.logger = logger;

    const getChildLogger = (name: string) => {
      return this.logger.child?.(name) ?? this.logger;
    };

    this.dependencyResolver.logger = getChildLogger(DependencyResolver.name);
    this.store.logger = getChildLogger(this.store.constructor.name);
  }

  addCondition(name: string, condition: any) {
    if (this.state !== `planning`) {
      const badStateError = new Error(
        `Cannot add conditions after task execution starts!`,
      );
      this.logger.fatal(`Bad state! ${badStateError.message}`, badStateError);
      throw badStateError;
    }
    this.conditionState.set(name, condition);
    this.logger.debug(`Setting condition ${name}: ${condition}`);
    return this;
  }

  setShouldLookupConditionsInStore(should: boolean) {
    this.shouldLookupConditionsInStore = should;
    return this;
  }

  /**
   * Registers a task with the scheduler
   * Throws an error if the task is already registered (name duplication). Task names must be unique.
   * @param task The task to register
   * @returns The instance of the scheduler, allows chaining commands
   */
  registerTask(task: Task): TaskScheduler {
    if (this.state !== `planning`) {
      const badStateError = new Error(
        `Cannot register tasks after task execution starts!`,
      );
      this.logger.fatal(`Bad state! ${badStateError.message}`);
      throw badStateError;
    }

    if (
      this.taskRegistry.has(task.name) &&
      task != this.taskRegistry.get(task.name)
    ) {
      const alreadyExistsError = new Error(
        `Task ${task.name} was already registered! This could cause a discrepancy, only register tasks once.`,
      );
      this.logger.fatal(alreadyExistsError.message, alreadyExistsError);
      throw alreadyExistsError;
    }
    if (task.dependsOn) {
      this.dependencyResolver.addDependencies(task.name, task.dependsOn);
      this.logger.debug(
        `Registered task ${task.name} and its ${task.dependsOn.length} dependencies`,
      );
    } else {
      this.dependencyResolver.addTask(task.name);
      this.logger.debug(`Registered task ${task.name} with no dependencies`);
    }
    this.taskRegistry.set(task.name, task);
    return this;
  }

  /**
   * Registers a provider that implements the TaskRunnerProvider interface
   * Will override the currently registered provider. If not set, the default
   * is a provider for the sync task runner.
   * @param provider The provider to use
   */
  registerTaskRunnerProvider(provider: TaskRunnerProvider) {
    this.taskRunnerProvider = provider;
    return this;
  }

  /**
   * Registers a new task store for use whenever persisted storage is needed to
   * complete tasks or process if tasks should run
   * @param store The store to set as the backing storage for task use
   */
  registerStore(store: Store) {
    this.store = store;
    store.logger = this.logger.child?.(store.constructor.name) ?? this.logger;
    return this;
  }

  async lookupMissingConditionsInStore(tasks: Task[]) {
    if (!this.shouldLookupConditionsInStore) {
      this.logger.debug(
        `Scheduler not looking up conditions in store due to shouldLookupConditionsInStore set to false`,
      );
      return;
    }

    for (const task of tasks) {
      const conditionNames = task.condition.getSubConditions?.() ?? [
        task.condition.name,
      ];
      for (const name of conditionNames) {
        if (!this.conditionState.has(name) && this.store.has(name)) {
          const conditionState = await this.store.get(name);
          this.logger.debug(
            `Found condition ${name} in store, setting value to ${conditionState}`,
          );
          this.addCondition(name, conditionState);
        }
      }
    }
  }

  /**
   * Will run test based on the condition state and the task's conditional to see if it should run
   * @param task The task to test the current condition states for
   * @returns True if the task should run given the current conditions, false otherwise
   */
  conditionsApplyTo(task: Task): boolean {
    const condition = task.condition;
    if (this.conditionState.has(task.condition.name)) {
      return condition.comparison(this.conditionState.get(task.condition.name));
    } else if (condition.compareFromState) {
      return condition.compareFromState(this.conditionState);
    } else {
      const invalidStateError = new Error(
        `Cannot resolve condition: ${condition.name} for task ${task.name}, is the state available?`,
      );
      this.logger.fatal(invalidStateError.message, invalidStateError);
      throw invalidStateError;
    }
  }

  /**
   * Will resolve tasks that need to be run in order, and apply the current conditions to them
   * to filter out tasks that don't meet the current conditions to run.
   * @returns The list of tasks to run in sorted order from the dependency resolver.
   */
  private async resolveTasksToRun() {
    const orderedTasks = this.dependencyResolver
      .getTaskOrder()
      .map((task) => this.taskRegistry.get(task));

    await this.lookupMissingConditionsInStore(orderedTasks);

    orderedTasks.forEach((task) => {
      if (!this.conditionsApplyTo(task)) {
        task.state = `skipped`;
        task.skippedReason = `Does not meet conditions`;
        this.logger.debug(
          `Task ${task.name} skipped due to not meeting conditions.`,
        );
      }
      if (task.state !== `idle` && task.state !== `skipped`) {
        const invalidStateError = new Error(
          `Task in invalid state before running! ${task.name} in state ${task.state}`,
        );
        this.logger.fatal(invalidStateError.message, invalidStateError);
        throw invalidStateError;
      }
    });

    const sortedTasks = orderedTasks.filter((task) => task.state === `idle`);

    // Setup task modifier loggers
    sortedTasks.forEach((task) => {
      task.modifiers.forEach((modifier, index) => {
        if (!modifier.logger) {
          let className = modifier.constructor.name;
          if (className === `Object`) {
            className = `Modifier:${index}`;
          }
          modifier.logger = this.logger.child?.(`${task.name}:${className}`);
        }
      });
    });
    return sortedTasks;
  }

  /**
   * Will resolve and run the tasks provided to the task scheduler
   */
  async run() {
    if (this.state !== `planning`) {
      const badStateError = new Error(
        `Cannot run tasks in already running state!`,
      );
      this.logger.fatal(`Bad state! ${badStateError.message}`, badStateError);
      throw badStateError;
    }
    const toRun = await this.resolveTasksToRun();

    this.logger.info(`Running tasks: found ${toRun.length} task(s) to run`);
    this.logger.debug(
      `Task order: ${JSON.stringify(toRun.map((run) => run.name))}`,
    );
    this.state = `running`;

    // start runner with tasks
    const runner = this.taskRunnerProvider.getTaskRunner(
      toRun,
      this.conditionState,
      this.logger,
      this.getStore(),
    );
    runner.on(`done`, () => {
      this.logger.info(`Done running ${toRun.length} task(s)`);
      this.state = `finished`;
    });
    runner.on(`error`, (error) => {
      this.logger.error(
        `Scheduler failed, error thrown when running tasks!`,
        error,
      );
      this.state = `error`;
    });
    runner.on(`taskComplete`, (task) => {
      this.logger.debug(`Task ${task.name} complete with status ${task.state}`);
    });
    this.runner = runner;
    await runner.start(process.argv);
  }
}
