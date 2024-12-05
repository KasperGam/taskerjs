# @optask/tasker

Tasker is a simple task runner designed to be useful when running deployment jobs. If you need to only run tasks under certain conditions, or only run a task once, you can hook up those conditions to the tasks you are running and schedule them to run on deployment, then watch as only the things you specified run.

## Quickstart

Install tasker:

```shell
yarn add @optask/tasker
```

Inside your project create a new task:

```javascript
import { BaseTask, EqualsCondition } from '@optask/tasker';

export class MigrateTask extends BaseTask {
    constructor() {
        super({
            name: 'Migrate', // All tasks must have a unique name
            condition: new EqualsCondition('version', '1.2.0'), // Only runs when the 'version' condition is equal to the string '1.2.0'
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

## Tasks

Creating tasks is as simple as extending the `Task` interface. Tasker is configured around class based tasks, but they can be any object as long as they extend that interface.

However, the recommended approach is to create a new class for each task you need, and simply extend `BaseTask` which has basic configuration already.

```javascript
export class MyTask extends BaseTask {
    constructor(){
        super({
            name: 'deploy' // All tasks must have a unique name
        })
    }

    // All tasks must have  run method, can be async
    override async run(args: string[]) {
        // Do things
    }
}
```

Tasks can be configured in a number of ways to fit almost any need:

- Dependencies: If you pass a `dependsOn` array of other task names, the scheduler will assure that those tasks are scheduled to run before this task.
- Conditions: All tasks must have a `Condition` which can be a test of if the task should run or not. See [conditions](#task-conditions) below. If no condition is set, the BaseTask will default to the `AnyCondition` which allows the task to run every time (under any conditions).
- Modifiers: Modifiers are special bits of code that can manage if tasks are skipped based on some external criteria. The most common modifier is the `RunOnceModifier` which modifies the execution of the task to only run one time, using a storage mechanism to track the previous run's state. See [modifiers](#task-modifiers) below.

Here is an example of a task that only runs once for each version of the app, depends on a separate task, and only runs when the 'step' of deployment is 'pre-deploy':

```javascript
import { BaseTask, EqualsCondition, RunOnceModifier } from '@optask/tasker';

export class MigrateTask extends BaseTask {
    constructor() {
        super({
            name: 'Migrate', // Our unique task name
            dependsOn: ['PauseTraffic'], // The "PauseTraffic" task must run first
            condition: new EqualsCondition('step', 'pre-deploy'), // We only run this task when 'step' is 'pre-deploy'
            modifiers: [new RunOnceModifier(['version'])], // We only run this one time for each 'version' of the app
        })
    }

    override async run(args: string[]) {
        // Do things here
    }
}
```

## Task Conditions

A condition is simply a test of if a task should run. When setting up the task scheduler, you must provide the conditions of the current deployment or scheduler run, often from environment variables or some external store.

## Task Modifiers
