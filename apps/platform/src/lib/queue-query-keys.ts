export function environmentQueuesQueryKey(environmentId: string) {
  return ["queues", environmentId] as const;
}

export function environmentRedisQueryKey(environmentId: string) {
  return ["redis", environmentId] as const;
}
