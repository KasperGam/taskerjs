import { TaskScheduler } from '../src/scheduler';
import { ExecutableTask } from '../src/tasks/executable.task';
import { TestLogger } from './test.logger';

describe(`Executable task`, () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    jest.resetAllMocks();
    scheduler = new TaskScheduler();
    //scheduler.setLogger(new TestLogger());
  });

  it(`Run executable succeeds`, async () => {
    const execCommand = new ExecutableTask({
      name: `hello-task`,
      command: `echo hello`,
      logger: new TestLogger(),
    });

    scheduler.registerTask(execCommand);

    await scheduler.run();

    expect(execCommand.state).toEqual(`success`);
  });

  it(`Cancel with signal`, async () => {
    const execCommand = new ExecutableTask({
      name: `sleep-task`,
      command: `sleep 60`,
      logger: new TestLogger(),
    });

    scheduler.registerTask(execCommand);

    const mockOn = jest.spyOn(process, `on`);
    let listener;
    mockOn.mockImplementation((_, _listener) => {
      listener = _listener;
      return process;
    });

    const runTask = scheduler.run();
    const exitSignal = new Promise((resolve) => {
      setTimeout(() => {
        listener(`SIGTERM`);
        resolve(`done`);
      }, 2000);
    });

    const [taskResult] = await Promise.allSettled([runTask, exitSignal]);

    expect(taskResult.status).toEqual(`rejected`);
    expect(execCommand.state).toEqual(`error`);
  }, 5000);

  it(`Rejects if command exits with error`, async () => {
    const execCommand = new ExecutableTask({
      name: `bad-cd-task`,
      command: `cd  asdf204_23oaa_df`,
    });

    scheduler.registerTask(execCommand);
    await expect(scheduler.run()).rejects.toThrow();
    expect(execCommand.state).toEqual(`error`);
  });
});
