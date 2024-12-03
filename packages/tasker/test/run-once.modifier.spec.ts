import { RunOnceModifier } from '../src/modifiers/run-once.modifier';
import { TaskScheduler } from '../src/scheduler';
import { InMemoryStore } from '../src/store/memory.store';
import { TestTask } from './test.task';

describe(`Run Once Modifier`, () => {
  let scheduler: TaskScheduler;
  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  it(`Only runs task one time - no condition dependencies`, async () => {
    const task = new TestTask({
      name: `a_run_once`,
      modifiers: [new RunOnceModifier()],
    });

    const store = new InMemoryStore();

    scheduler.registerTask(task);
    scheduler.registerStore(store);
    await scheduler.run();

    expect(task.state).toEqual(`success`);
    expect(task.skippedReason).toBeUndefined();

    // Reset
    task.reset();

    const newScheduler = new TaskScheduler();
    newScheduler.registerStore(store);
    newScheduler.registerTask(task);

    await newScheduler.run();

    expect(task.state).toEqual(`skipped`);
    expect(task.skippedReason).toBeDefined();
  });

  it(`Only runs task one time for different conditions`, async () => {
    const task = new TestTask({
      name: `a-run-once`,
      modifiers: [new RunOnceModifier([`version`, `name`])], // so we only run once depending on the conditions
    });

    const store = new InMemoryStore();

    scheduler.registerTask(task);
    scheduler.addCondition(`version`, `1.2.3`);
    scheduler.addCondition(`name`, `test`);
    scheduler.registerStore(store);
    await scheduler.run();

    expect(task.state).toEqual(`success`);
    expect(task.skippedReason).toBeUndefined();

    // Reset
    task.reset();

    const newScheduler = new TaskScheduler();
    newScheduler.registerStore(store);
    newScheduler.registerTask(task);
    newScheduler.addCondition(`version`, `1.2.4`); // Different version/name- will run task again
    newScheduler.addCondition(`name`, `test2`);

    await newScheduler.run();

    expect(task.state).toEqual(`success`);
    expect(task.skippedReason).toBeUndefined();

    // Reset
    task.reset();

    const newScheduler2 = new TaskScheduler();
    newScheduler2.registerStore(store);
    newScheduler2.registerTask(task);
    newScheduler2.addCondition(`version`, `1.2.3`); // Same version and name, won't run task
    newScheduler2.addCondition(`name`, `test`);

    await newScheduler2.run();

    expect(task.state).toEqual(`skipped`);
    expect(task.skippedReason).toBeDefined();
  });
});
