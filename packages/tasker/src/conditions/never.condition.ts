import { Condition } from '../types';

/**
 * A condition that will always resolve to false, aka the task
 * with this condition will never run.
 *
 * This is usually only used for testing.
 */
export class NeverCondition<T = never> implements Condition<T> {
  value: T;
  name: string;

  constructor(_name: string) {
    this.value = null;
    this.name = _name;
  }

  comparison() {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  compareFromState(state: Map<string, any>) {
    return false;
  }
}
