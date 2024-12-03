import { Condition } from '../types';

export class EqualsCondition<V extends string | number | boolean>
  implements Condition<V>
{
  value: V;
  name: string;

  constructor(_name: string, _value: V) {
    this.value = _value;
    this.name = _name;
  }

  comparison(condition: V) {
    return condition === this.value;
  }
}
