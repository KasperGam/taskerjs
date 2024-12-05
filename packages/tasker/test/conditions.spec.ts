import {
  ANDCondition,
  EqualsCondition,
  GreaterThanCondition,
  LessThanCondition,
  NOTCondition,
  ORCondition,
} from '../src/conditions';
import { GeneralCondition } from '../src/conditions/general.condition';
import { TaskScheduler } from '../src/scheduler';
import { TestTask } from './test.task';

describe(`Conditions`, () => {
  let task: TestTask;
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
    task = new TestTask({ name: `test` });
  });

  it(`Equals condition`, () => {
    scheduler.addCondition(`test`, `123`);

    task.condition = new EqualsCondition(`test`, `123`); // '123' = '123' so pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);

    task.condition = new EqualsCondition(`test`, `1`); // '1' != '123' so fail
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    task.condition = new EqualsCondition(`test`, 123); // 123 != '123' so fail
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    task.condition = new EqualsCondition(`otherCondition`, 1); // This is not defined so throw
    expect(() => scheduler.conditionsApplyTo(task)).toThrow();
  });

  it(`Less than condition`, () => {
    scheduler.addCondition(`test`, 2);
    scheduler.addCondition(`date`, new Date(`04/01/2024`));

    task.condition = new LessThanCondition(`test`, 5); // 2 < 5 so pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);

    task.condition = new LessThanCondition(`test`, 2); // 2 not < 2 so fail
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    task.condition = new LessThanCondition(`date`, new Date(`05/01/2024`)); // 4/1/24 < 5/1/24 so pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);

    task.condition = new LessThanCondition(`date`, new Date(`04/01/2024`)); // 4/1/24 not < 4/1/24 so fail
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    task.condition = new LessThanCondition(`otherCondition`, 1); // This is not defined so throw
    expect(() => scheduler.conditionsApplyTo(task)).toThrow();
  });

  it(`Greater than condition`, () => {
    scheduler.addCondition(`test`, 4);
    scheduler.addCondition(`date`, new Date(`06/01/2024`));

    task.condition = new GreaterThanCondition(`test`, 2); // 4 > 2 so pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);

    task.condition = new GreaterThanCondition(`test`, 4); // 4 not > 4 so fail
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    task.condition = new GreaterThanCondition(`date`, new Date(`05/01/2024`)); // 6/1/24 > 5/1/24 so pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);

    task.condition = new GreaterThanCondition(`date`, new Date(`06/01/2024`)); // 6/1/24 not > 6/1/24 so fail
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    task.condition = new GreaterThanCondition(`otherCondition`, 1); // This is not defined so throw
    expect(() => scheduler.conditionsApplyTo(task)).toThrow();
  });

  it(`Not condition`, () => {
    scheduler.addCondition(`test`, 5);

    const equals5 = new EqualsCondition(`test`, 5);
    const equals1 = new EqualsCondition(`test`, 1);

    task.condition = new NOTCondition(equals5); // 5 = 5 so fail
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    task.condition = new NOTCondition(equals1); // 5 != 1 so pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);

    // Test custom name- should allow for resolving sub-condition

    task.condition = new NOTCondition(equals5); // 5 = 5 so fail
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    task.condition = new NOTCondition(equals1); // 5 != 1 so pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);
  });

  it(`OR condition`, () => {
    scheduler.addCondition(`test`, 5);
    scheduler.addCondition(`version`, `1.1`);
    scheduler.addCondition(`date`, new Date(`05/01/2024`));

    const lessThan6 = new LessThanCondition(`test`, 6); // passes
    const lessThan5 = new LessThanCondition(`test`, 5); // fails
    const version1_1 = new EqualsCondition(`version`, `1.1`); // passes
    const version2 = new EqualsCondition(`version`, `2.0`); // fails
    const afterDate = new GreaterThanCondition(`date`, new Date(`04/01/2024`)); // passes
    const afterDate2 = new GreaterThanCondition(`date`, new Date(`07/01/2024`)); // fails

    // All pass so or passes:
    task.condition = new ORCondition([lessThan6, version1_1, afterDate]); // pass, pass, pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);

    // One passes so or passes:
    task.condition = new ORCondition([lessThan6, version2, afterDate2]); // pass, fail, fail
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);

    task.condition = new ORCondition([lessThan5, version1_1, afterDate2]); // fail, pass, fail
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);

    task.condition = new ORCondition([lessThan5, version2, afterDate]); // fail, fail, pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);

    // All fail so or fails
    task.condition = new ORCondition([lessThan5, version2, afterDate2]); // fail, fail, pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    // A condition could not be evaluated so throws
    task.condition = new ORCondition([
      new EqualsCondition(`otherCondition`, 5),
    ]);
    expect(() => scheduler.conditionsApplyTo(task)).toThrow();
  });

  it(`AND condition`, () => {
    scheduler.addCondition(`test`, 5);
    scheduler.addCondition(`version`, `1.1`);
    scheduler.addCondition(`date`, new Date(`05/01/2024`));

    const lessThan6 = new LessThanCondition(`test`, 6); // passes
    const lessThan5 = new LessThanCondition(`test`, 5); // fails
    const version1_1 = new EqualsCondition(`version`, `1.1`); // passes
    const version2 = new EqualsCondition(`version`, `2.0`); // fails
    const afterDate = new GreaterThanCondition(`date`, new Date(`04/01/2024`)); // passes
    const afterDate2 = new GreaterThanCondition(`date`, new Date(`07/01/2024`)); // fails

    // All pass so and passes:
    task.condition = new ANDCondition([lessThan6, version1_1, afterDate]); // pass, pass, pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);

    // One fails so and fails:
    task.condition = new ANDCondition([lessThan6, version1_1, afterDate2]); // pass, pass, fail
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    task.condition = new ANDCondition([lessThan6, version2, afterDate]); // pass, fail, pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    task.condition = new ANDCondition([lessThan5, version1_1, afterDate]); // fail, pass, pass
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    // All fail so and fails
    task.condition = new ANDCondition([lessThan5, version2, afterDate2]); // fail, fail, fail
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    // A condition could not be evaluated so throws
    task.condition = new ANDCondition([
      new EqualsCondition(`otherCondition`, 5),
    ]);
    expect(() => scheduler.conditionsApplyTo(task)).toThrow();
  });

  it(`Compound conditions`, () => {
    scheduler.addCondition(`test`, 5);
    scheduler.addCondition(`version`, `1.1`);
    scheduler.addCondition(`name`, 'joe');
    scheduler.addCondition(`try`, 2);

    const testIs5 = new EqualsCondition(`test`, 5); // true
    const version2 = new EqualsCondition(`version`, `2.0`); // false
    const version1_1 = new EqualsCondition(`version`, `1.1`); // true

    const nameHasJ = new GeneralCondition(
      `name`,
      (nameVar: string) => nameVar.toLowerCase().includes(`j`), // true
    );
    const nameHasK = new GeneralCondition(
      `name`,
      (nameVar: string) => nameVar.toLowerCase().includes(`k`), // false
    );

    const tryLessThan5 = new LessThanCondition(`try`, 5); // true
    const tryGreaterThan10 = new GreaterThanCondition(`try`, 10); // false

    const compound1 = new ANDCondition([
      new ORCondition([version1_1, nameHasK]), // true
      new NOTCondition(tryGreaterThan10), // true
      tryLessThan5, // true
    ]); // so true

    task.condition = compound1;
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);

    const compound2 = new ORCondition([
      new ORCondition([tryGreaterThan10, new NOTCondition(tryLessThan5)]), // false
      nameHasK, // false
      new ANDCondition([nameHasJ, testIs5, version2]), // false
    ]); // so false
    task.condition = compound2;
    expect(scheduler.conditionsApplyTo(task)).toEqual(false);

    // Change version to 2, compound 2 should now pass
    scheduler.addCondition(`version`, `2.0`);
    expect(scheduler.conditionsApplyTo(task)).toEqual(true);
  });
});
