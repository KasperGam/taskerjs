# @optask/nestjs

A wrapper package that allows usage of `@optask/tasker` within a [nestjs](https://docs.nestjs.com/) application.

## Quickstart

Install tasker and nestjs plugin:

```shell
yarn add @optask/tasker @optask/nestjs
```

First create a task you want to run:

```javascript
import { Injectable } from '@nestjs/common';
import { Task, BaseTask } from '@optask/nextjs';

@Injectable()
@Task({
  name: 'task',
})
class MyTask extends BaseTask {
  run() {
    // do something
  }
}
```

_note_ you must extend `BaseTask` and use the `@Task` decorator for the task to be registered successfully.

Then create a module that provides this task:

```javascript
import { Module } from '@nestjs/common';

import { MyTask } from './MyTask';

@Module({
    providers: [MyTask],
    exports: [MyTask],
});
export class TaskModule {}
```

Finally, import this module and register the scheduler module:

```javascript
import { Module } from '@nestjs/common';
import { TaskSchedulerModule } from '@optask/nestjs';
import { InMemoryStore } from '@optask/tasker';

import { TaskModule } from './TaskModule';
import { RunTasker } from './RunTasker';

@Module({
  imports: [
    TaskSchedulerModule.register({
      imports: [TaskModule],
      store: new InMemoryStore(), // Use a real store here if you need it!
    }),
  ],
  providers: [RunTasker],
})
export class AppModule {}
```

Then the scheduler service can be used to run the tasks:

```javascript
import { Injectable } from '@nestjs/common';
import { TaskSchedulerService } from '@optask/nestjs';

@Injectable()
export class TaskRunner {
    constructor(private readonly scheduler: TaskSchedulerService){}

    async run() {
        // Do any editing you need to
        this.scheduler.addCondition('myCondition', 'test');

        // Run the tasks
        await this.scheduler.run();
    }
}
```

## Creating Tasks

Tasks are providers registered in the scheduler with the `@Task` decorator.
They should extend `BaseTask` from this library, which provides the base implementation
of a task in `tasker`.

You can optionally provide the task's run condition, modifiers, and dependencies as well
with the provided metadata to the `@Task` decorator. See the `@optask/tasker` documentation
for information on task conditions, modifiers, and dependencies.

For example, to define a task that would run once on each version on a pre deploy step,
and depends on a task called migrate, you could pass this configuration:

```javascript
import { Injectable } from '@nestjs/common';
import { Task, BaseTask } from '@optask/nestjs';
import { EqualsCondition, RunOnceModifier } from '@optask/tasker';

@Injectable()
@Task({
  name: 'validate',
  dependencies: ['migrate'],
  condition: new EqualsCondition('step', 'pre-deploy'),
  modifiers: [new RunOnceModifier(['version'])],
})
export class ValidateTask extends BaseTask {
  async run() {
    // do some validation here
  }
}
```

## Setting the task scheduler conditions

In the above example, we need the conditions of `version` and `step` to be defined.
To do so, you can provide the conditions directly in the register method of the `TaskSchedulerModule`

Here is an example of providing the configuration directly:

```javascript
import { Module } from '@nestjs/common';
import { TaskSchedulerModule } from '@optask/nestjs';
import { FileSystemStore } from '@optask/tasker';

@Module({
  imports: [
    TaskSchedulerModule.register({
      imports: [ModuleWithTasks],
      store: new FileSystemStore(),
      conditions: {
        step: process.env.STEP,
        version: process.env.VERSION,
      },
    }),
  ],
})
export class AppModule {}
```

You can also use another provider that implements the ConfigurationProvider interface (or both!)

```javascript
import { Module } from '@nestjs/common';
import { TaskSchedulerModule } from '@optask/nestjs';
import { FileSystemStore } from '@optask/tasker';

@Module({
  imports: [
    TaskSchedulerModule.register({
      imports: [ModuleWithTasksAndConditionProvider],
      store: new FileSystemStore(),
      conditions: {
        step: `pre-deploy`,
      },
      conditionsProvider: MyConditionsProvider, // Make sure this is provided from the imported modules
    }),
  ],
})
export class PreDeployModule {}
```

Example of a conditions provider:

```javascript
import { Injectable } from '@nestjs/common';
import { ConditionsProvider } from '@optask/nestjs';

@Injectable()
export class MyConditionsProvider implements ConditionsProvider {
    async getConditions() {
        const version = await getVersion(); // can be async or pull from another injected provider

        return {
            version,
        };
    }
}
```

In the above example, the conditions will get merged together from the raw values and the
result of `getConditions` call, where the `getConditions` values will override those from
the raw values.
