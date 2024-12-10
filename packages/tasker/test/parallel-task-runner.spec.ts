import { ParallelTaskRunnerProvider } from '../src/runner/parallel.taskRunnerProvider';
import { TaskScheduler } from '../src/scheduler';
import { TestTask } from './test.task';
import { setTimeout } from 'timers/promises';

describe(`Parallel task runner`, () => {
  let scheduler: TaskScheduler;
  beforeEach(() => {
    scheduler = new TaskScheduler();
    scheduler.registerTaskRunnerProvider(new ParallelTaskRunnerProvider());
  });

  it(`Runs tasks no dependencies`, async () => {
    const taskA = new TestTask({ name: `a` });
    const taskB = new TestTask({ name: `b` });
    const taskC = new TestTask({ name: `c` });
    const taskD = new TestTask({ name: `d` });
    const taskE = new TestTask({ name: `e` });
    scheduler.registerTask(taskA);
    scheduler.registerTask(taskB);
    scheduler.registerTask(taskC);
    scheduler.registerTask(taskD);
    scheduler.registerTask(taskE);

    await scheduler.run();
    expect(taskA.taskWasRun).toEqual(true);
    expect(taskB.taskWasRun).toEqual(true);
    expect(taskC.taskWasRun).toEqual(true);
    expect(taskD.taskWasRun).toEqual(true);
    expect(taskE.taskWasRun).toEqual(true);

    expect(taskA.state).toEqual(`success`);
    expect(taskB.state).toEqual(`success`);
    expect(taskC.state).toEqual(`success`);
    expect(taskD.state).toEqual(`success`);
    expect(taskE.state).toEqual(`success`);

    expect(scheduler.getState()).toEqual(`finished`);
  });

  it(`Runs tasks with dependencies`, async () => {
    // Expected order would be e -> c -> b -> a -> d
    const order = [];
    const taskA = new TestTask({
      name: `a`,
      dependsOn: [`b`, `c`],
      run: () => order.push(`a`),
    });
    const taskB = new TestTask({
      name: `b`,
      dependsOn: [`e`, `c`],
      run: async () => {
        order.push(`b`);
        await setTimeout(500);
      },
    });
    const taskC = new TestTask({
      name: `c`,
      dependsOn: [`e`],
      run: async () => {
        order.push(`c`);
        await setTimeout(200);
      },
    });
    const taskD = new TestTask({
      name: `d`,
      dependsOn: [`a`],
      run: () => order.push(`d`),
    });
    const taskE = new TestTask({
      name: `e`,
      run: async () => {
        order.push(`e`);
        await setTimeout(500);
      },
    });
    scheduler.registerTask(taskA);
    scheduler.registerTask(taskB);
    scheduler.registerTask(taskC);
    scheduler.registerTask(taskD);
    scheduler.registerTask(taskE);

    await scheduler.run();
    expect(taskA.taskWasRun).toEqual(true);
    expect(taskB.taskWasRun).toEqual(true);
    expect(taskC.taskWasRun).toEqual(true);
    expect(taskD.taskWasRun).toEqual(true);
    expect(taskE.taskWasRun).toEqual(true);

    expect(scheduler.getState()).toEqual(`finished`);

    expect(order).toEqual(expect.arrayContaining([`e`, `c`, `b`, `a`, `d`]));
    expect(order[0]).toEqual(`e`);
    expect(order[1]).toEqual(`c`);
    expect(order[2]).toEqual(`b`);
    expect(order[3]).toEqual(`a`);
    expect(order[4]).toEqual(`d`);
  });
});
