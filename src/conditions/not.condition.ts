import { Condition } from '../types';

export class NOTCondition<V, C extends Condition<V>>
  implements Condition<V, C>
{
  value: C;
  name: string;

  constructor(_name: string, _value: C) {
    this.value = _value;
    this.name = _name;
  }

  comparison(condition: V) {
    return !this.value.comparison(condition);
  }
}
