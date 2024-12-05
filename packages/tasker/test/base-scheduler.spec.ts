import { ANDCondition } from '../src/conditions/and.condition';
import { EqualsCondition } from '../src/conditions/equals.condition';
import { GreaterThanCondition } from '../src/conditions/greaterThan.condition';
import { LessThanCondition } from '../src/conditions/lessThan.condition';
import { ORCondition } from '../src/conditions/or.condition';
import { TaskScheduler } from '../src/scheduler';
import { TestTask } from './test.task';

describe(`Task Scheduler`, () => {
  let scheduler: TaskScheduler;
  beforeEach(() => {
    scheduler = new TaskScheduler();
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
      run: () => order.push(`b`),
    });
    const taskC = new TestTask({
      name: `c`,
      dependsOn: [`e`],
      run: () => order.push(`c`),
    });
    const taskD = new TestTask({
      name: `d`,
      dependsOn: [`a`],
      run: () => order.push(`d`),
    });
    const taskE = new TestTask({ name: `e`, run: () => order.push(`e`) });
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

  it(`Detects tasks with dependency cycle`, async () => {
    // Should detect clear cycle here from a->b->d->e->a
    const taskA = new TestTask({
      name: `a`,
      dependsOn: [`b`, `c`],
    });
    const taskB = new TestTask({
      name: `b`,
      dependsOn: [`e`],
    });
    const taskC = new TestTask({
      name: `c`,
    });
    const taskD = new TestTask({
      name: `d`,
      dependsOn: [`a`],
    });
    const taskE = new TestTask({ name: `e`, dependsOn: [`d`] });
    scheduler.registerTask(taskA);
    scheduler.registerTask(taskB);
    scheduler.registerTask(taskC);
    scheduler.registerTask(taskD);
    scheduler.registerTask(taskE);

    await expect(async () => await scheduler.run()).rejects.toThrow();
  });

  it(`Runs tasks based on conditions`, async () => {
    const versionCondition = new EqualsCondition(`version`, `1.0.0`);
    const deployDateCondition = new GreaterThanCondition(
      `deployDate`,
      new Date(`2024/05/01`),
    );
    const numDeploysCondition = new LessThanCondition(`deploys`, 4);
    const taskA = new TestTask({
      name: `a`,
      condition: versionCondition,
    });
    const taskB = new TestTask({
      name: `b`,
      condition: deployDateCondition,
    });
    const taskC = new TestTask({
      name: `c`,
      condition: numDeploysCondition,
    });
    const taskD = new TestTask({
      name: `d`,
      condition: new ANDCondition([deployDateCondition, versionCondition]),
    });
    const taskE = new TestTask({
      name: `e`,
      condition: new ORCondition([deployDateCondition, numDeploysCondition]),
    });
    scheduler.registerTask(taskA);
    scheduler.registerTask(taskB);
    scheduler.registerTask(taskC);
    scheduler.registerTask(taskD);
    scheduler.registerTask(taskE);

    scheduler.addCondition(`version`, `1.0.0`);
    scheduler.addCondition(`deploys`, 6);
    scheduler.addCondition(`deployDate`, new Date(`2024/05/11`));

    await scheduler.run();
    expect(taskA.taskWasRun).toEqual(true);
    expect(taskB.taskWasRun).toEqual(true);
    expect(taskC.taskWasRun).toEqual(false);
    expect(taskD.taskWasRun).toEqual(true);
    expect(taskE.taskWasRun).toEqual(true);

    expect(scheduler.getState()).toEqual(`finished`);

    // try with less favorable conditions
    [taskA, taskB, taskC, taskD, taskE].forEach((task) => task.reset());

    const scheduler2 = new TaskScheduler();
    scheduler2.registerTask(taskA);
    scheduler2.registerTask(taskB);
    scheduler2.registerTask(taskC);
    scheduler2.registerTask(taskD);
    scheduler2.registerTask(taskE);

    scheduler2.addCondition(`version`, `1.0.0`);
    scheduler2.addCondition(`deploys`, 10);
    scheduler2.addCondition(`deployDate`, new Date(`2024/04/24`));

    await scheduler2.run();

    expect(taskA.taskWasRun).toEqual(true);
    expect(taskB.taskWasRun).toEqual(false);
    expect(taskC.taskWasRun).toEqual(false);
    expect(taskD.taskWasRun).toEqual(false);
    expect(taskE.taskWasRun).toEqual(false);

    expect(scheduler.getState()).toEqual(`finished`);
  });
});
