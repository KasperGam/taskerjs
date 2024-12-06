import { EqualsCondition, ORCondition } from '../src/conditions';
import { TaskScheduler } from '../src/scheduler';
import { InMemoryStore } from '../src/store';
import { TestTask } from './test.task';

describe(`Store Conditions`, () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  it(`Does not do lookup`, async () => {
    const testTask = new TestTask({
      name: `a`,
      condition: new EqualsCondition(`test`, 1),
    });

    scheduler.registerTask(testTask);
    await expect(scheduler.run()).rejects.toThrow();
  });

  it(`Does do lookup`, async () => {
    const testTask = new TestTask({
      name: `a`,
      condition: new EqualsCondition(`test`, `1`),
    });

    const testTask2 = new TestTask({
      name: `b`,
      condition: new ORCondition([
        new EqualsCondition(`test`, `3`),
        new EqualsCondition(`version`, `1`),
      ]),
    });

    const store = new InMemoryStore();
    store.set(`test`, `1`);
    store.set(`version`, `2`);

    scheduler
      .setShouldLookupConditionsInStore(true)
      .registerStore(store)
      .registerTask(testTask)
      .registerTask(testTask2);

    await scheduler.run();

    expect(testTask.taskWasRun).toEqual(true);
    expect(testTask.state).toEqual(`success`);

    expect(testTask2.taskWasRun).toEqual(false);
  });

  it(`Provided conditions override store conditions`, async () => {
    const testTask = new TestTask({
      name: `a`,
      condition: new EqualsCondition(`test`, `1`),
    });

    const store = new InMemoryStore();
    store.set(`test`, `1`);
    store.set(`version`, `2`);

    scheduler
      .setShouldLookupConditionsInStore(true)
      .registerStore(store)
      .registerTask(testTask)
      .addCondition(`test`, `2`);

    await scheduler.run();

    expect(testTask.taskWasRun).toEqual(false);
  });
});
