import { ConsoleLogger } from '../logger/console.logger';
import { Logger, Modifier, ModifierArgs, Task, TaskState } from '../types';

type StoredTaskState = {
  name: string;
  status: TaskState;
  lastRun: string;
  conditions: Record<string, any>;
};

export class RunOnceModifier implements Modifier {
  logger: Logger = new ConsoleLogger();
  constructor(private readonly conditions?: string[]) {}

  async shouldTaskRun({
    conditionState,
    task,
    store,
  }: ModifierArgs): Promise<boolean> {
    const key = this.getTaskKey(conditionState, task.name);

    const taskState = await store.get(key);

    if (!taskState) {
      this.logger.debug(
        `No prior task state found for ${task.name} in store. Not blocking task from being run.`,
      );
      return true;
    }
    try {
      const parsed = JSON.parse(taskState);

      const successStatus: TaskState = `success`;
      const taskRan = parsed.status === successStatus;
      this.logger.debug(
        `Task state found for ${task.name} in store. Will ${taskRan ? 'block' : 'not block'} task from running due to status being ${parsed.status}`,
      );
      return !taskRan;
    } catch {
      this.logger.error(
        `Error thrown when trying to fetch task state!\nkey: ${key}\ntask: ${task.name}\nstate: ${conditionState}`,
      );
      return false;
    }
  }

  async taskDidRun({ conditionState, task, store }: ModifierArgs) {
    const key = this.getTaskKey(conditionState, task.name);
    const state = JSON.stringify(this.getTaskState(task, conditionState));
    this.logger.debug(
      `Setting task ${task.name} run state in the store: ${state}`,
    );
    await store.set(key, state);
  }

  private getTaskKey(state: Map<string, any>, name: string) {
    const conditions = this.conditions ?? [];
    const conditionValues = conditions.map(
      (condition) => `${condition}_${state.get(condition)?.toString()}`,
    );
    const fixedName = name.replace(/_/gm, `-`);
    const base = [...conditionValues, fixedName].join(`_`);

    return `run-tasks_${base}`;
  }

  private getTaskState(
    task: Task,
    conditionState: Record<string, any>,
  ): StoredTaskState {
    const conditionMap: Record<string, any> = {};

    for (const condition of this.conditions ?? []) {
      conditionMap[condition] = conditionState.get(condition);
    }
    return {
      name: task.name,
      status: task.state,
      lastRun: new Date().toISOString(),
      conditions: conditionMap,
    };
  }
}
