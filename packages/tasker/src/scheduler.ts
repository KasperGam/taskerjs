import { DependencyResolver } from './resolver/dependency.resolver';
import { SyncTaskRunnerProvider } from './runner/sync.taskRunnerProvider';
import { InMemoryStore } from './store/memory.store';
import {
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

  // Hold onto scheduler state
  private state: SchedulerState = `planning`;
  private runner: TaskRunner | null = null;
  private store: Store = new InMemoryStore();

  getState(): SchedulerState {
    return this.state;
  }

  getStore(): Store {
    return this.store;
  }

  addCondition(name: string, condition: any) {
    if (this.state !== `planning`) {
      throw new Error(`Cannot add conditions after task execution starts!`);
    }
    this.conditionState.set(name, condition);
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
      throw new Error(`Cannot register tasks after task execution starts!`);
    }

    if (
      this.taskRegistry.has(task.name) &&
      task != this.taskRegistry.get(task.name)
    ) {
      throw new Error(
        `Task ${task.name} was already registered! This could cause a discrepancy, only register tasks once.`,
      );
    }
    if (task.dependsOn) {
      this.dependencyResolver.addDependencies(task.name, task.dependsOn);
    } else {
      this.dependencyResolver.addTask(task.name);
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
  }

  /**
   * Registers a new task store for use whenever persisted storage is needed to
   * complete tasks or process if tasks should run
   * @param store The store to set as the backing storage for task use
   */
  registerStore(store: Store) {
    this.store = store;
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
      throw new Error(
        `Cannot resolve condition: ${condition.name} for task ${task.name}, is the state available?`,
      );
    }
  }

  /**
   * Will resolve tasks that need to be run in order, and apply the current conditions to them
   * to filter out tasks that don't meet the current conditions to run.
   * @returns The list of tasks to run in sorted order from the dependency resolver.
   */
  private resolveTasksToRun() {
    const orderedTasks = this.dependencyResolver
      .getTaskOrder()
      .map((task) => this.taskRegistry.get(task));

    orderedTasks.forEach((task) => {
      if (!this.conditionsApplyTo(task)) {
        task.state = `skipped`;
        task.skippedReason = `Does not meet conditions`;
      }
      if (task.state !== `idle` && task.state !== `skipped`) {
        throw new Error(
          `Task in invalid state before running! ${task.name} in state ${task.state}`,
        );
      }
    });

    const sortedTasks = orderedTasks.filter((task) => task.state === `idle`);
    return sortedTasks;
  }

  /**
   * Will resolve and run the tasks provided to the task scheduler
   */
  async run() {
    if (this.state !== `planning`) {
      throw new Error(`Cannot run tasks in already running state!`);
    }
    const toRun = this.resolveTasksToRun();

    console.log(
      `Running tasks, found ordering: ${JSON.stringify(toRun.map((run) => run.name))}`,
    );
    this.state = `running`;

    // start runner with tasks
    const runner = this.taskRunnerProvider.getTaskRunner(
      toRun,
      this.conditionState,
      this.getStore(),
    );
    runner.on(`done`, () => {
      console.log(`Done running ${toRun.length} task(s)`);
      this.state = `finished`;
    });
    runner.on(`error`, () => {
      console.error(`Scheduler failed, error thrown when running tasks!`);
      this.state = `error`;
    });
    this.runner = runner;
    await runner.start(process.argv);
  }
}
