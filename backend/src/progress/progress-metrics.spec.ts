import { describe, expect, it } from '@jest/globals';
import {
  accuracyPercent,
  bayesianAccuracyPercent,
  clampWeakTopicMinAttempts,
  clampWeakTopicThreshold,
  coveragePercent,
  weakTopicConfidence,
} from './progress-metrics';

describe('progress-metrics', () => {
  it('computes accuracy percent correctly', () => {
    expect(accuracyPercent(8, 10)).toBe(80);
    expect(accuracyPercent(0, 0)).toBe(0);
  });

  it('computes coverage percent correctly', () => {
    expect(coveragePercent(3, 12)).toBe(25);
    expect(coveragePercent(0, 0)).toBe(0);
  });

  it('applies bayesian smoothing for weak topic accuracy', () => {
    expect(bayesianAccuracyPercent(1, 1)).toBe(70.83);
    expect(bayesianAccuracyPercent(20, 40)).toBe(51.67);
  });

  it('computes confidence from observed attempts', () => {
    expect(weakTopicConfidence(0)).toBe(0);
    expect(weakTopicConfidence(5)).toBe(50);
    expect(weakTopicConfidence(20)).toBe(80);
  });

  it('clamps threshold and min attempts to safe ranges', () => {
    expect(clampWeakTopicThreshold(200)).toBe(99);
    expect(clampWeakTopicThreshold(0)).toBe(1);
    expect(clampWeakTopicThreshold(Number.NaN)).toBe(60);

    expect(clampWeakTopicMinAttempts(0)).toBe(1);
    expect(clampWeakTopicMinAttempts(999)).toBe(50);
    expect(clampWeakTopicMinAttempts(Number.NaN)).toBe(5);
  });
});
