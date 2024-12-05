import { Condition } from '../types';

export class NOTCondition<V, C extends Condition<V>>
  implements Condition<V, C>
{
  value: C;
  name: string;

  constructor(_value: C) {
    this.value = _value;
    this.name = `NOT_${this.getSubConditions().join(`_`)}`;
  }

  comparison(condition: V) {
    return !this.value.comparison(condition);
  }

  compareFromState(state: Map<string, any>) {
    const subName = this.value.name;
    if (state.has(subName)) {
      return !this.value.comparison(state.get(subName));
    } else if (this.value.compareFromState) {
      return !this.value.compareFromState(state);
    } else {
      throw new Error(
        `Unable to determine how to test sub condition ${this.value.name} of ${this.name}. Was a condition not set?`,
      );
    }
  }

  getSubConditions() {
    return this.value.getSubConditions?.() ?? [this.value.name];
  }
}
