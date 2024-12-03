import { Condition } from '../types';

/**
 * A condition that will always resolve to true, aka the task
 * with this condition will always run.
 */
export class AnyCondition<T = never> implements Condition<T> {
  value: T;
  name: string;

  constructor(_name: string) {
    this.value = null;
    this.name = _name;
  }

  comparison() {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  compareFromState(state: Map<string, any>) {
    return true;
  }
}
