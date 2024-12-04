export const ProvidedConditions = `Tasker_Provided_Conditions`;
export type Conditions = Map<string, any>;

export interface ConditionsProvider {
  getConditions: () => Record<string, any> | Promise<Record<string, any>>;
}
