import {
  DynamicModule,
  InjectionToken,
  Module,
  ModuleMetadata,
} from '@nestjs/common';
import { InMemoryStore, Store } from '@optask/tasker';
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
  global?: boolean;
  store?: Store;
  storeProvider?: InjectionToken<Store>;
  conditions?: Record<string, any>;
  conditionsProvider?: InjectionToken<ConditionsProvider>;
};

/**
 * The main module to interface with Tasker in NextJS.
 * Use this module and register the tasks you want to run
 * in a separate module/modules that you pass into this
 * module's imports.
 *
 * Also provide a store, and optionally conditions/a conditions
 * provider. You can provide a store by directly passing a
 * store instance, or set the storeProvider with the injected
 * token of a provider that implements the store interface.
 *
 * If both conditions and a conditions provider are given,
 * both will be used.
 * The conditions provider will override any conditions that
 * exist in both.
 *
 * Note this module is not global by default. You can pass
 * in a global option if you need it to be.
 */
@Module({})
export class TaskSchedulerModule {
  static register(options: TaskSchedulerModuleOptions) {
    const storeProvider = options.store
      ? {
          provide: StoreProvider,
          useValue: options.store,
        }
      : options.storeProvider
        ? {
            provide: StoreProvider,
            useExisting: options.storeProvider,
          }
        : {
            provide: StoreProvider,
            useValue: new InMemoryStore(),
          };

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
        storeProvider,
        TaskSchedulerService,
      ],
      exports: [TaskSchedulerService, StoreProvider],
      global: options.global,
    };

    return dynamicModule;
  }
}
