import {
  DynamicModule,
  InjectionToken,
  Module,
  ModuleMetadata,
} from '@nestjs/common';
import { Store } from '@optask/tasker';
import {
  Conditions,
  ConditionsProvider,
  ProvidedConditions,
} from './conditions.provider';
import { TaskSchedulerService } from './task-scheduler.service';
import { Store as StoreProvider } from './store.provider';
import { DiscoveryModule } from '@golevelup/nestjs-discovery';

export type TaskSchedulerModuleOptions = {
  imports?: ModuleMetadata[`imports`];
  store: Store;
  conditions?: Record<string, any>;
  conditionsProvider?: InjectionToken<ConditionsProvider>;
};

@Module({})
export class TaskSchedulerModule {
  static register(options: TaskSchedulerModuleOptions) {
    const dynamicModule: DynamicModule = {
      imports: options.imports
        ? [...options.imports, DiscoveryModule]
        : [DiscoveryModule],
      module: TaskSchedulerModule,
      providers: [
        {
          provide: ProvidedConditions,
          useFactory: async (
            extraProvider?: ConditionsProvider,
          ): Promise<Conditions> => {
            let conditions = options.conditions ?? {};
            if (extraProvider) {
              const extraConditions = await extraProvider.getConditions();
              conditions = { ...conditions, ...extraConditions };
            }

            return new Map(Object.entries(conditions));
          },
          inject: options.conditionsProvider
            ? [options.conditionsProvider]
            : undefined,
        },
        {
          provide: StoreProvider,
          useValue: options.store,
        },
        TaskSchedulerService,
      ],
      exports: [TaskSchedulerService],
    };

    return dynamicModule;
  }
}
