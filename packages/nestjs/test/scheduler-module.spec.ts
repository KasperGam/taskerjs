import { Test } from '@nestjs/testing';
import { TaskSchedulerModule } from '../src/task-scheduler.module';
import { TestTaskModule } from './test-task.module';
import { InMemoryStore } from '@optask/tasker';
import { TaskSchedulerService } from '../src/task-scheduler.service';
import { TestTask } from './test.task';
import { INestApplication } from '@nestjs/common';

describe(`Schedular Module`, () => {
  let schedulerService: TaskSchedulerService;
  let task: TestTask;
  let app: INestApplication;

  beforeAll(async () => {
    const testModule = await Test.createTestingModule({
      imports: [
        TaskSchedulerModule.register({
          imports: [TestTaskModule],
          store: new InMemoryStore(),
        }),
      ],
    }).compile();

    app = testModule.createNestApplication();
    await app.init();

    schedulerService = app.get(TaskSchedulerService);
    task = app.get(TestTask);
  }, 5000);

  afterAll(async () => {
    await app.close();
  }, 5000);

  it(`Compiles correctly`, () => {
    expect(app).toBeDefined();
    expect(schedulerService).toBeDefined();
    expect(task).toBeDefined();
  });

  it(`Runs registered task`, async () => {
    await schedulerService.run();
    expect(schedulerService.getState()).toEqual(`finished`);
    expect(task.state).toEqual(`success`);
    expect(task.wasRun).toEqual(true);
  });
});
