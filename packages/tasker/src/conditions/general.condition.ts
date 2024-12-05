import { Condition, ConditionComparison } from '../types';

/**
 * A basic implementation of a generalized condition that takes
 * a callback and must return true or false if the condition passes.
 * This allows for any custom logic you need in a condition.
 *
 * @example```
 * const allowedNames = ['henry', 'mark', 'joseph'];
 * new GeneralCondition('name', (nameValue: string) => allowedNames.includes(nameValue));
 * ```
 * To get valid types, provide a type for the callback variable.
 * The callback is called instead when ever the comparison function is called for this condition,
 * with the condition value for the condition's name key.
 */
export class GeneralCondition<C, V extends ConditionComparison<C>>
  implements Condition<C, V>
{
  value: V;
  name: string;

  constructor(_name: string, callback: V) {
    this.value = callback;
    this.name = _name;
  }

  comparison(condition: C) {
    return this.value(condition);
  }
}
