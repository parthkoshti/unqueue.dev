function toDisplayAttemptCount(attemptsMade: number) {
  return attemptsMade + 1;
}

function toDisplayMaxAttempts(maxAttempts: number) {
  return maxAttempts > 0 ? maxAttempts : 1;
}

function attemptNoun(count: number) {
  return count === 1 ? "attempt" : "attempts";
}

export function formatJobAttemptsValue(
  attemptsMade: number,
  maxAttempts?: number,
) {
  const current = toDisplayAttemptCount(attemptsMade);

  if (maxAttempts != null) {
    const max = toDisplayMaxAttempts(maxAttempts);
    return `${current} / ${max}`;
  }

  return String(current);
}

export function formatJobAttemptsLabel(
  attemptsMade: number,
  maxAttempts?: number,
) {
  const current = toDisplayAttemptCount(attemptsMade);

  if (maxAttempts != null) {
    const max = toDisplayMaxAttempts(maxAttempts);
    return `${current}/${max} ${attemptNoun(max)}`;
  }

  return `${current} ${attemptNoun(current)}`;
}
