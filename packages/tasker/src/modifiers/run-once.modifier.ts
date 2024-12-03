import { Modifier, ModifierArgs, Store, Task, TaskState } from '../types';

type StoredTaskState = {
  name: string;
  status: TaskState;
  lastRun: string;
  conditions: Record<string, any>;
};

export class RunOnceModifier implements Modifier {
  constructor(private readonly conditions?: string[]) {}

  async shouldTaskRun({
    conditionState,
    task,
    store,
  }: ModifierArgs): Promise<boolean> {
    const key = this.getTaskKey(conditionState, task.name);

    const taskState = await store.get(key);

    if (!taskState) {
      return true;
    }
    try {
      const parsed = JSON.parse(taskState);

      const successStatus: TaskState = `success`;
      const taskRan = parsed.status === successStatus;

      return !taskRan;
    } catch (e) {
      console.error(
        `Error thrown when trying to fetch task state!\nkey: ${key}\ntask: ${task.name}\nstate: ${conditionState}`,
      );
      return false;
    }
  }

  async taskDidRun({ conditionState, task, store }: ModifierArgs) {
    const key = this.getTaskKey(conditionState, task.name);
    const state = this.getTaskState(task, conditionState);

    await store.set(key, JSON.stringify(state));
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
