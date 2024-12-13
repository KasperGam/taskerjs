import { DiscoveryService } from '@golevelup/nestjs-discovery';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Store, TaskScheduler } from '@optask/tasker';
import { TaskMetaKey } from './constants';
import { BaseTask, TaskMetadata } from './task.interface';
import { Store as StoreToken } from './store.provider';
import { Conditions, ProvidedConditions } from './conditions.provider';
import { NestLogger } from './nestjs.logger';

@Injectable()
export class TaskSchedulerService
  extends TaskScheduler
  implements OnModuleInit
{
  constructor(
    @Inject(StoreToken) store: Store,
    @Inject(ProvidedConditions) conditions: Conditions,
    private readonly discoveryService: DiscoveryService,
  ) {
    super();

    this.setLogger(new NestLogger(TaskScheduler.name));
    this.registerStore(store);
    for (const condition of conditions.keys()) {
      this.addCondition(condition, conditions.get(condition));
    }
  }

  async onModuleInit() {
    await this.discoverAndRegisterTasks();
  }

  private async discoverAndRegisterTasks() {
    const tasks =
      await this.discoveryService.providersWithMetaAtKey<TaskMetadata>(
        TaskMetaKey,
      );

    for (const task of tasks) {
      const instance = task.discoveredClass.instance;
      if (instance instanceof BaseTask) {
        this.registerTask(task.discoveredClass.instance as BaseTask);
      } else {
        throw new Error(`Task ${task.meta.name} found on provider ${task.discoveredClass.name} which does not
          inherit from BaseTask! All tasks must extend BaseTask!`);
      }
    }
  }
}
