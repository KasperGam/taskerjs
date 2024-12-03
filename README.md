# Tasker

Tasker is a simple task runner designed to be useful when running deployment jobs. If you need to only run tasks under certain conditions, or only run a task once, you can hook up those conditions to the tasks you are running and schedule them to run on deployment, then watch as only the things you specified run.

An easy example would be db migrations that you want to run when you release a certain version, say 1.2.0, of your backend. You can setup a task that will only ever run once on the condition of the version being deployed matches 1.2.0.

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

    override async run(args: any[]) {
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
