export const WEAK_TOPIC_DEFAULT_THRESHOLD_PERCENT = 60;
export const WEAK_TOPIC_DEFAULT_MIN_ATTEMPTS = 5;
export const WEAK_TOPIC_MAX_MIN_ATTEMPTS = 50;
export const WEAK_TOPIC_PRIOR_ATTEMPTS = 5;
export const WEAK_TOPIC_PRIOR_ACCURACY_PERCENT = 65;

export function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export function accuracyPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return roundToTwo((correct / total) * 100);
}

export function coveragePercent(
  attemptedUniqueQuestions: number,
  totalQuestions: number,
): number {
  if (totalQuestions <= 0) return 0;
  return roundToTwo((attemptedUniqueQuestions / totalQuestions) * 100);
}

export function bayesianAccuracyPercent(
  correct: number,
  total: number,
  priorAccuracyPercent: number = WEAK_TOPIC_PRIOR_ACCURACY_PERCENT,
  priorAttempts: number = WEAK_TOPIC_PRIOR_ATTEMPTS,
): number {
  const sanitizedPriorAttempts = Math.max(0, priorAttempts);
  const priorAccuracy = clampWeakTopicThreshold(priorAccuracyPercent) / 100;

  if (total <= 0 && sanitizedPriorAttempts === 0) return 0;

  const posterior =
    (correct + sanitizedPriorAttempts * priorAccuracy) /
    (total + sanitizedPriorAttempts);

  return roundToTwo(posterior * 100);
}

export function weakTopicConfidence(
  totalAttempts: number,
  priorAttempts: number = WEAK_TOPIC_PRIOR_ATTEMPTS,
): number {
  const total = Math.max(0, totalAttempts);
  const prior = Math.max(0, priorAttempts);

  if (total === 0 && prior === 0) return 0;

  return roundToTwo((total / (total + prior)) * 100);
}

export function clampWeakTopicThreshold(thresholdPercent: number): number {
  if (!Number.isFinite(thresholdPercent)) {
    return WEAK_TOPIC_DEFAULT_THRESHOLD_PERCENT;
  }

  return Math.min(99, Math.max(1, Math.floor(thresholdPercent)));
}

export function clampWeakTopicMinAttempts(minAttempts: number): number {
  if (!Number.isFinite(minAttempts)) {
    return WEAK_TOPIC_DEFAULT_MIN_ATTEMPTS;
  }

  return Math.min(
    WEAK_TOPIC_MAX_MIN_ATTEMPTS,
    Math.max(1, Math.floor(minAttempts)),
  );
}
