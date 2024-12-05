import { AnyCondition } from '../conditions/any.condition';
import { Condition, Modifier, Task, TaskState } from '../types';

export type BaseTaskArgs = {
  name: string;
  condition?: Condition<any>;
  modifiers?: Modifier[];
  dependsOn?: string[];
};

export abstract class BaseTask implements Task {
  name: string;
  condition: Condition<any>;
  dependsOn?: string[];
  state: TaskState = `idle`;
  modifiers: Modifier[];
  skippedReason?: string;

  constructor(args: BaseTaskArgs) {
    this.name = args.name;
    this.condition = args.condition ?? new AnyCondition(`any`);
    this.dependsOn = args.dependsOn;
    this.modifiers = args.modifiers ?? [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  run(args: string[]) {
    throw new Error(
      `Unimplemented task ${this.name}. Did you forget to subclass BaseTask and implement run?`,
    );
  }
}
