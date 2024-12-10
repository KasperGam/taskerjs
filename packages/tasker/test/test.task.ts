import { BaseTask, BaseTaskArgs } from '../src/tasks/base.task';

export class TestTask extends BaseTask {
  taskWasRun: boolean = false;
  toRun?: () => void | Promise<void>;

  constructor(args: BaseTaskArgs & { run?: () => void }) {
    super(args);
    this.toRun = args.run;
  }

  override async run() {
    await this.toRun?.();
    this.taskWasRun = true;
  }

  reset() {
    this.taskWasRun = false;
    this.state = `idle`;
    this.skippedReason = undefined;
  }
}
