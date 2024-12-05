import { Condition } from '../types';

export class ANDCondition<T extends unknown[], C extends Condition<T[number]>[]>
  implements Condition<T, C>
{
  value: C;
  name: string;

  constructor(_value: C) {
    this.value = _value;
    this.name = `AND_${this.getSubConditions().join(`_`)}`;
  }

  comparison(conditions: T) {
    if (conditions.length < this.value.length) {
      return false;
    }

    for (let i = 0; i < this.value.length; i++) {
      const conditionValue = conditions[i];
      const condition = this.value[i];
      if (!condition.comparison(conditionValue)) {
        return false;
      }
    }
    return true;
  }

  compareFromState(state: Map<string, any>) {
    for (let i = 0; i < this.value.length; i++) {
      const condition = this.value[i];
      let passesCondition = true;
      if (state.has(condition.name)) {
        passesCondition = condition.comparison(state.get(condition.name));
      } else if (condition.compareFromState) {
        passesCondition = condition.compareFromState(state);
      } else {
        throw new Error(
          `Unable to determine how to test sub condition ${condition.name} of ${this.name}. Was a condition not set?`,
        );
      }

      if (!passesCondition) {
        return false;
      }
    }
    return true;
  }

  getSubConditions() {
    const subConditions: string[] = [];
    for (const condition of this.value) {
      const toAdd = condition.getSubConditions?.() ?? [condition.name];
      subConditions.push(...toAdd);
    }

    return subConditions;
  }
}
