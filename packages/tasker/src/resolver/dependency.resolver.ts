import { ConsoleLogger } from '../logger/console.logger';
import { Logger } from '../types';

export class DependencyResolver {
  logger: Logger = new ConsoleLogger();

  private readonly tree: Map<string, Set<string>> = new Map();

  /**
   * Adds a new task with no dependencies to the resolver
   * Will do nothing if the task was already added
   * @param task The task name to add
   */
  addTask(task: string) {
    const current = this.tree.get(task);
    if (!current) {
      this.tree.set(task, new Set<string>());
    }
  }

  /**
   * Will add a new dependency to a given task. Will also add
   * the task to the resolver if it was not found.
   * Will do nothing if the task and dependency were already added
   * @param task The task name to add a dependency for
   * @param dependency The task name of the dependency
   */
  addDependency(task: string, dependency: string) {
    const current = this.tree.get(task);
    if (!current) {
      this.tree.set(task, new Set<string>([dependency]));
    } else {
      current.add(dependency);
    }
  }

  /**
   * Will add a list of new dependencies to a given task. Will also
   * add the task to the resolver if it was not found.
   * Will do nothing if the task and dependencies were already found.
   * @param task The task to add dependencies to
   * @param dependencies A list of dependencies to add
   */
  addDependencies(task: string, dependencies: string[]) {
    const current = this.tree.get(task);
    if (!current) {
      this.tree.set(task, new Set<string>(dependencies));
    } else {
      for (const dependency of dependencies) {
        current.add(dependency);
      }
    }
  }

  /**
   * Will get task dependents from the resolver.
   * @param task The task name
   * @returns A set of tasks that depend on this task to run first
   */
  getDependents(task: string): Set<string> {
    const keys = Array.from(this.tree.keys());
    return new Set<string>(keys.filter((key) => this.tree.get(key).has(task)));
  }

  /**
   * Will return the list of dependencies already registered with the resolver
   * for a given task
   * @param task The task name
   * @returns A set of dependencies registered with the resolver for this task
   */
  getDependencies(task: string): Set<string> {
    return this.tree.get(task);
  }

  /**
   * Will determine if a dependency cycle exists in the resolver, which is not allowed
   * @returns True if a cycle exists, false otherwise
   */
  dependencyCycleExists(): boolean {
    const visited = new Map<string, boolean>();
    const inStack = new Map<string, boolean>();
    for (const key of this.tree.keys()) {
      visited.set(key, false);
      inStack.set(key, false);
    }

    for (const key of this.tree.keys()) {
      if (!visited.get(key) && this.hasCycleFromTask(key, visited, inStack)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Will return a topological sorting of the dependent tree (a reversal of the dependency tree)
   * using Kahn's algorithm.
   * This results in a list of the registered task names in order such that executing them
   * one by one will result in a correct order based on the registered dependencies.
   * @returns A topological sorting of the reversed dependency tree, aka
   * will return tasks that have no dependencies, then in order from there.
   */
  getTaskOrder(): string[] {
    const reversed = this.reverseTree();

    const queue: string[] = [];

    const dependents: Map<string, number> = new Map();
    for (const key of this.tree.keys()) {
      const size = this.tree.get(key).size;
      dependents.set(key, size);
      if (size === 0) {
        queue.push(key);
      }
    }

    const result: string[] = [];

    while (queue.length !== 0) {
      const node = queue.shift();
      result.push(node);
      for (const dependent of reversed.get(node)) {
        const newSize = dependents.get(dependent) - 1;
        dependents.set(dependent, newSize);
        if (newSize === 0) {
          queue.push(dependent);
        }
      }
    }

    if (result.length !== this.tree.size) {
      const resolverError = new Error(
        `Dependent tree has a cycle! Please find and fix the cycle first!`,
      );
      this.logger.fatal(resolverError.message, resolverError);
      throw resolverError;
    }

    this.logger.trace(
      `Resolved dependencies and sorted successfully. Order:\n${JSON.stringify(result, undefined, 2)}`,
    );

    return result;
  }

  private reverseTree(): Map<string, Set<string>> {
    const reversed: Map<string, Set<string>> = new Map();
    for (const key of this.tree.keys()) {
      reversed.set(key, this.getDependents(key));
    }

    return reversed;
  }

  private hasCycleFromTask(
    key: string,
    visited: Map<string, boolean>,
    inStack: Map<string, boolean>,
  ) {
    if (!visited.has(key)) {
      visited.set(key, true);
      inStack.set(key, true);

      for (const dep of this.tree.get(key)) {
        if (!visited.has(dep) && this.hasCycleFromTask(dep, visited, inStack)) {
          return true;
        } else if (inStack.has(dep)) {
          return true;
        }
      }
    }

    inStack.set(key, false);
    return false;
  }
}
