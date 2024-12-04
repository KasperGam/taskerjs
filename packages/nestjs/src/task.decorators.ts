import 'reflect-metadata';
import { BaseTask, TaskMetadata } from './task.interface';
import { Type } from '@nestjs/common';
import { TaskMetaKey } from './constants';

const applyClassMetadata = (
  options: any,
  metadataKey: string,
): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(metadataKey, options, target);
    return target;
  };
};

type TaskClassDecorator = <TFunction extends Type<BaseTask>>(
  target: TFunction,
) => void | TFunction;

/**
 * Decorator for registering tasks with tasker. The task scheduler
 * will register all tasks using this decorator.
 * @param options Task metadata. Must provide the task name,
 * can optionally provide the condition, modifiers, and dependencies.
 */
export const Task = (options: TaskMetadata): TaskClassDecorator => {
  return applyClassMetadata(options, TaskMetaKey);
};
