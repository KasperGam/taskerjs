import { ConsoleLogger } from '../logger/console.logger';
import { Logger } from '../types';
import { BaseTask, BaseTaskArgs } from './base.task';
import { spawn } from 'child_process';

export type CommandArgs = {
  /**
   * The command to run
   */
  command: string;
  /**
   * Optional - any extra arguments to pass to the command when running it
   */
  extraArgs?: string[];
  /**
   * Optional - the logger to use if using a custom logger
   */
  logger?: Logger;
  /**
   * Optional - Set a timeout for the executable command (in ms). If set to 0
   * or not provided, no timeout will be applied.
   */
  timeout?: number;
};

type ExecutableTaskArgs = BaseTaskArgs & CommandArgs;

// This would be 50 tasks running at the same time!
const ABSOLUTE_MAX_EVENT_LISTENERS = 150;

/**
 * A class to run executable (shell) commands as a NodeJS child process.
 * Will use `spawn` to create a new process and run the specified command.
 *
 * It is recommended to provide the logger you are using as well as a timeout
 * in case the command hangs for any reason.
 *
 * @example
 * ```
 * export class EchoTask extends ExecutableTask {
 *    constructor() {
 *      super({
 *        name: 'say-hello-task',
 *        command: 'echo',
 *        extraArgs: '"hello world"',
 *        timeout: 5000, // timeout after 5 seconds
 *      });
 *    }
 * }
 * ```
 */
export class ExecutableTask extends BaseTask {
  command: string;
  extraArgs?: string[];
  logger?: Logger;
  timeout?: number;

  constructor(args: ExecutableTaskArgs) {
    super(args);
    this.command = args.command;
    this.extraArgs = args.extraArgs;
    this.logger = this.logger ? this.logger : args.logger;
    this.timeout = args.timeout;
  }

  async run() {
    // Parse out the command to run and any args
    const commandParts = this.command.split(` `);
    const [base, ...rest] = commandParts;

    const logger = this.logger ?? new ConsoleLogger();

    if (!base) {
      throw new Error(`No executable command specified: ${this.command}`);
    }

    const allOtherArgs = [...rest, ...(this.extraArgs ?? [])].filter(
      (_arg) => !!_arg,
    );

    if (allOtherArgs.length > 0) {
      logger.info(
        `${this.name}: Running command ${base} with args ${JSON.stringify(allOtherArgs)}`,
      );
    } else {
      logger.info(`${this.name}: Running command ${base}`);
    }

    // Create a new process to run the command in
    const childProcess = spawn(
      base,
      allOtherArgs.length > 0 ? allOtherArgs : undefined,
      {
        cwd: process.cwd(),
        env: process.env,
        timeout: this.timeout === 0 ? undefined : this.timeout,
      },
    );

    // Add listeners to stdout and stderr
    childProcess.stdout.on(`data`, (chunk) => {
      logger.info(`[${this.command}]: ${chunk}`);
    });

    childProcess.stderr.on(`data`, (chunk) => {
      logger.error(`[${this.command}]: ${chunk}`);
    });

    const listener = (signal: number | NodeJS.Signals) => {
      logger.trace(`[${this.command}]: Killing process with signal ${signal}`);
      childProcess.kill(signal);
    };

    // Setup abort signal propagation to child process
    const abortSignals: NodeJS.Signals[] = [`SIGABRT`, `SIGINT`, `SIGTERM`];

    // Make sure we don't add extra listeners warnings with event emitter
    const currentMax = process.getMaxListeners();
    const newListenerCount = Math.min(
      currentMax + abortSignals.length,
      ABSOLUTE_MAX_EVENT_LISTENERS,
    );
    process.setMaxListeners(newListenerCount);
    const addedListeners = newListenerCount - currentMax;

    // Setup the abort signal listeners
    abortSignals.forEach((signal) => {
      process.on(signal, listener);
    });

    // Finally wait for the child process to finish
    const resolvedPromise = new Promise((resolve, reject) => {
      childProcess.on(`close`, (code, signal) => {
        // Remove the abort signals
        abortSignals.forEach((_signal) => {
          process.off(_signal, listener);
        });
        // Reset changes to the max listener count
        process.setMaxListeners(process.getMaxListeners() - addedListeners);

        const hadError = (code !== null && code > 0) || !!signal;
        logger.debug(`[${this.command}]: Finished with code ${code ?? signal}`);

        // Either resolve or reject based on what the process did
        if (hadError) {
          reject(
            new Error(
              `Process ${this.command} in task ${this.name} exited with code ${code ?? signal}`,
            ),
          );
        } else {
          resolve(
            `Process ${this.command} in task ${this.name} completed successfully.`,
          );
        }
      });
    });

    const message = await resolvedPromise;

    // Log the message and return. If there was an error, it is thrown by the
    // promise above.
    logger.info(message);
    return;
  }
}
