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

export const Task = (options: TaskMetadata): TaskClassDecorator => {
  return applyClassMetadata(options, TaskMetaKey);
};
