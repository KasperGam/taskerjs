import { Injectable } from '@nestjs/common';
import { Task } from '../src/task.decorators';
import { BaseTask } from '../src/task.interface';

@Injectable()
@Task({
  name: `TestTask`,
})
export class TestTask extends BaseTask {
  wasRun: boolean = false;

  run() {
    this.wasRun = true;
  }

  reset() {
    this.state = `idle`;
    this.skippedReason = undefined;
    this.wasRun = false;
  }
}
