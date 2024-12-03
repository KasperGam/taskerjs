import { AnyCondition } from '../conditions/any.condition';
import { Condition, Task } from '../types';

export type BaseTaskArgs = {
  name: string;
  condition?: Condition<any>;
  dependsOn?: string[];
};

export abstract class BaseTask implements Task {
  name: string;
  condition: Condition<any>;
  dependsOn?: string[];

  constructor(args: BaseTaskArgs) {
    this.name = args.name;
    this.condition = args.condition ?? new AnyCondition(`any`);
    this.dependsOn = args.dependsOn;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  run(args: any[]) {
    throw new Error(
      `Unimplemented task ${this.name}. Did you forget to subclass BaseTask and implement run?`,
    );
  }
}
