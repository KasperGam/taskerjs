# @optask/storage-s3

A simple wrapper around `@aws-sdk/client-s3` to implement a basic storage from `@optask/tasker`.

Will utilize s3 file paths in order to store task state.

## Quickstart

Install the package:

```shell
yarn add @optask/tasker @optask/storage-s3
```

When you are configuring the scheduler, set the storage mechanism:

```javascript
import { TaskScheduler } from '@optask/tasker';
import { S3Store } from '@optask/storage-s3';

const scheduler = new TaskScheduler();

scheduler.registerStore(
  new S3Store({
    region: 'us-east-1',
    bucketName: 'deployTasks',
    credentials: {
      accessKeyId: '******',
      secretAccessKey: '********',
    },
  }),
);
```

Note that region and bucketName are required, but all other options
inherit from the aws sdk s3 client options, see docs [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-s3/)
