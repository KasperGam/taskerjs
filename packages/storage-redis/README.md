# @optask/storage-redis

A simple wrapper around `ioredis` to implement a basic storage from `@optask/tasker`.

Will utilize redis strings to store task state.

## Quickstart

Install the package:

```shell
yarn add @optask/tasker @optask/storage-redis
```

When you are configuring the scheduler, set the storage mechanism:

```javascript
import { TaskScheduler } from '@optask/tasker';
import { RedisStore } from '@optask/storage-redis';

const scheduler = new TaskScheduler();

scheduler.registerStore(
  new RedisStore({
    host: 'localhost',
    port: 6379,
    namespace: 'tasker',
  }),
);
```

Note that namespace is a required parameter that defines how the key space will be prefixed.
All other options inherit from ioredis options, see the ioredis docs [here](https://github.com/redis/ioredis?tab=readme-ov-file#connect-to-redis)
