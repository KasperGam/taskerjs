import {
  Condition,
  Modifier,
  BaseTask as TaskerBaseTask,
  TaskState,
} from '@optask/tasker';
import { TaskMetaKey } from './constants';

export abstract class BaseTask extends TaskerBaseTask {
  name: string;
  condition: Condition<any, any>;
  dependsOn?: string[];
  state: TaskState;
  modifiers: Modifier[];
  skippedReason?: string;
  abstract run(args: any[]): void;

  constructor() {
    super({ name: `BaseTask` });
    const taskMetadata = Reflect.getMetadata(TaskMetaKey, this) as TaskMetadata;
    if (!taskMetadata) {
      throw new Error(`Must be decorated with the @Task decorator!`);
    }

    this.name = taskMetadata.name;
    if (taskMetadata.condition) {
      this.condition = taskMetadata.condition;
    }
    if (taskMetadata.dependsOn) {
      this.dependsOn = taskMetadata.dependsOn;
    }
    if (taskMetadata.modifiers) {
      this.modifiers = taskMetadata.modifiers;
    }
  }
}

export interface TaskMetadata {
  name: string;
  condition?: Condition<any, any>;
  dependsOn?: string[];
  modifiers?: Modifier[];
}
