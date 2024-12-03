import { ModifierArgs } from '../types';

export const shouldRunTask = async (args: ModifierArgs): Promise<boolean> => {
  const modifierPromises = args.task.modifiers
    .filter((modifier) => modifier.shouldTaskRun)
    .map((modifier) => {
      const shouldRun = modifier.shouldTaskRun?.(args);
      return shouldRun;
    });
  const results = await Promise.allSettled(modifierPromises);

  const rejected = results.find((promise) => promise.status === `rejected`);
  if (rejected) {
    throw new Error(rejected.reason);
  }

  const hasNegative = results.find(
    (result) => result.status === `fulfilled` && result.value === false,
  );

  if (hasNegative) {
    return false;
  } else {
    return true;
  }
};

export const notifyWillRunTask = async (args: ModifierArgs) => {
  const modifierPromises = args.task.modifiers
    .filter((modifier) => modifier.taskWillRun)
    .map((modifier) => {
      const willRun = modifier.taskWillRun?.(args);
      return willRun;
    });
  const results = await Promise.allSettled(modifierPromises);

  const rejected = results.find((promise) => promise.status === `rejected`);
  if (rejected) {
    throw new Error(rejected.reason);
  }
};

export const notifyDidRunTask = async (args: ModifierArgs) => {
  const modifierPromises = args.task.modifiers
    .filter((modifier) => modifier.taskDidRun)
    .map((modifier) => {
      const didRun = modifier.taskDidRun?.(args);
      return didRun;
    });
  const results = await Promise.allSettled(modifierPromises);

  const rejected = results.find((promise) => promise.status === `rejected`);
  if (rejected) {
    throw new Error(rejected.reason);
  }
};
