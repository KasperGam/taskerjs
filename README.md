# Tasker

A general and powerful tool to run tasks written in nodejs.

## Quickstart

```shell
yarn add @optask/tasker
```

Inside your project create a new task:

```javascript
import { BaseTask, EqualsCondition } from '@optask/tasker';

export class MigrateTask extends BaseTask {
    constructor() {
        super({
            name: 'Migrate',
            condition: new EqualsCondition('version', '1.2.0'),
        });
    }

    override async run(args: string[]) {
        const db = someDBConnection(args);
        await db.migrate();
    }
}
```

Then run it with a scheduler:

```javascript
import { TaskScheduler } from '@optask/tasker';
import { MigrateTask } from 'MigrateTask';

const scheduler = new TaskScheduler();

// Add the tasks to run to the task scheduler
scheduler.registerTask(new MigrateTask());

// Tell the scheduler about the conditions it is running under
scheduler.addCondition(`version`, process.env.VERSION);

// Finally run the tasks with the scheduler
await scheduler.run();
```

## Packages

There are several packages in this repo depending on your use case, but all extend from the base package [@optask/tasker](./packages/tasker).

- Tasker: [@optask/tasker](./packages/tasker/README.md). Base package.
- NestJS: [@optask/nestjs](./packages/nestjs/README.md). A wrapper for nestjs apps.
- S3 Storage: [@optask/storage-s3](./packages/storage-s3/README.md). A store implementation using s3.

There is more information in the readmes for those packages.
