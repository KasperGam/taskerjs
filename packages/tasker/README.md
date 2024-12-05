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

```javascript
scheduler.addCondition('version', '1.2.3'); // Example of adding a condition
```

Alternatively you can provide conditions from the registered store:

```javascript
scheduler.setShouldLookupConditionsInStore(true);
await scheduler.getStore().set('version', '1.2.3');
```

The base implementation of a task specifies its condition as `AnyCondition` by default, meaning it will always run.

Note that every task has exactly one condition attached to it under which it is evaluated by the scheduler before running. If your conditions become more complex, you can use "compound" conditions instead. Three basic compound conditions are provided for you:

- `NOTCondition` takes in a condition and inverts it's output
- `ANDCondition` will result in the logical 'and' of an array of input conditions
- `ORCondition` will result in the logical 'or' of an array of input conditions

Note that with these building blocks you should be able to construct any other complex condition. tasker provides a set of simple conditions as well:

- `EqualsCondition` asserts that the condition equals some value
- `LessThanCondition` asserts that the condition (a number or Date) is less than some value
- `GreaterThanCondition` asserts that the condition (a number or Date) is greater than some value

There is also a `GeneralCondition` which takes in a callback so you can create whatever condition parameters you need.

For example, you could test if a character/substring appears in a string:

```javascript
const hasCharacterCondition = (name: string, value: string) => {
    return new GeneralCondition(name, (nameValue: string) => nameValue.includes(value));
};

const someConditionHasAnS = hasCharacterCondition('someConditionVariable', 's');
```

To create your own condition, you can use general condition or implement the `Condition` interface.

Here is an example of how the simple `EqualsCondition` is implemented:

```javascript
export class EqualsCondition<V extends string | number | boolean>
  implements Condition<V>
{
  value: V;
  name: string;

  constructor(_name: string, _value: V) {
    this.value = _value;
    this.name = _name;
  }

  comparison(condition: V) {
    return condition === this.value;
  }
}
```

### Testing your conditions

The scheduler implements a method `conditionsApplyTo` which takes a task and will test its condition against the scheduler's condition state.

```javascript
const myCondition = new GeneralCondition('test', () => );//something
scheduler.addCondition('test', 'value');

const task = new MyTask();
task.condition = myCondition;

const pass = scheduler.conditionsApplyTo(task);
```

## Task Modifiers

Another way to modify how tasks will run is to attach modifiers to them. Tasks have an array of modifiers that implement the `Modifier` interface.

A modifier can implement 3 methods to attach to the lifecycle of a task:

- `shouldTaskRun` Will provide the modifier an opportunity to skip the task based on some test it does
- `taskWillRun` Called before the task runs
- `taskDidRun` Called after the task completes (or if the task throws)

All modifier methods take in some data about the current task, store, conditions, etc.

A common modifier provided by tasker is the `RunOnceModifier` which stores when tasks succeed in the provided store and will only run them one time (the task is skipped if it succeeded earlier according to the store).

The modifier takes in a list of conditions that it should re-run under, aka if you have a `version` condition, you can make the task run once per version by providing `version` condition to the modifier:

```javascript
task.modifiers.push(new RunOnceModifier([`version`]));
```
