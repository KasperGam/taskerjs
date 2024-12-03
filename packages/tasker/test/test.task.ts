import { BaseTask, BaseTaskArgs } from '../src/tasks/base.task';

export class TestTask extends BaseTask {
  taskWasRun: boolean = false;
  toRun?: () => void;

  constructor(args: BaseTaskArgs & { run?: () => void }) {
    super(args);
    this.toRun = args.run;
  }

  override async run() {
    this.toRun?.();
    this.taskWasRun = true;
  }

  reset() {
    this.taskWasRun = false;
  }
}
