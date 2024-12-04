const getMetadataKey = (baseKey: string): string => {
  return `Tasker:${baseKey}`;
};

export const TaskMetaKey = getMetadataKey(`Task`);
