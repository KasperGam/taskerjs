import { Condition } from '../types';

export class LessThanCondition<V extends Date | number>
  implements Condition<V>
{
  value: V;
  name: string;

  constructor(_name: string, _value: V) {
    this.value = _value;
    this.name = _name;
  }

  comparison(condition: V) {
    return condition < this.value;
  }
}
