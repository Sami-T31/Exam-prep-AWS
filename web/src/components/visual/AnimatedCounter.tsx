'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;

export default function AnimatedCounter({
  value,
  durationMs = 1500,
  decimals,
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const currentValueRef = useRef(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const from = currentValueRef.current;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (reducedMotion || durationMs <= 0) {
      const frame = window.requestAnimationFrame(() => {
        currentValueRef.current = target;
        setDisplayValue(target);
      });
      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    if (from === target) {
      return;
    }

    let frame = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const easedProgress = easeOutCubic(progress);
      const next = from + (target - from) * easedProgress;

      currentValueRef.current = next;
      setDisplayValue(next);

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
        return;
      }

      currentValueRef.current = target;
      setDisplayValue(target);
    };

    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [durationMs, value]);

  const fractionDigits =
    decimals ?? (Math.abs(value - Math.trunc(value)) > 0 ? 1 : 0);
  const formattedNumber = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return (
    <span>
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
}
