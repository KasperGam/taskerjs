import { Condition } from '../types';

export class ORCondition<V extends unknown[], C extends Condition<V[number]>[]>
  implements Condition<V, C>
{
  value: C;
  name: string;

  constructor(_name: string, _value: C) {
    this.value = _value;
    this.name = _name;
  }

  comparison(conditions: V) {
    for (let i = 0; i < conditions.length; i++) {
      const conditionValue = conditions[i];
      const condition = this.value[i];
      if (condition.comparison(conditionValue)) {
        return true;
      }
    }
    return false;
  }

  compareFromState(state: Map<string, any>) {
    for (let i = 0; i < this.value.length; i++) {
      const condition = this.value[i];
      let passesCondition = false;
      if (state.has(condition.name)) {
        passesCondition = condition.comparison(state.get(condition.name));
      } else if (condition.compareFromState) {
        passesCondition = condition.compareFromState(state);
      } else {
        passesCondition = false;
      }

      if (passesCondition) {
        return true;
      }
    }

    return false;
  }
}