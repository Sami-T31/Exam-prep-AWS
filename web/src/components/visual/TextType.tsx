'use client';

import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';

interface TextTypeProps {
  text?: string[];
  texts?: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  loop?: boolean;
  deletingEnabled?: boolean;
  showCursor?: boolean;
  cursorCharacter?: string;
  variableSpeedEnabled?: boolean;
  variableSpeedMin?: number;
  variableSpeedMax?: number;
  cursorBlinkDuration?: number;
  className?: string;
}

function clampSpeed(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function randomBetween(min: number, max: number): number {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function TextType({
  text,
  texts,
  typingSpeed = 75,
  deletingSpeed = 50,
  pauseDuration = 1500,
  loop = true,
  deletingEnabled = true,
  showCursor = true,
  cursorCharacter = '_',
  variableSpeedEnabled = false,
  variableSpeedMin = 60,
  variableSpeedMax = 120,
  cursorBlinkDuration = 0.5,
  className,
}: TextTypeProps) {
  const phrases = useMemo(() => {
    const source =
      texts && texts.length > 0 ? texts : text && text.length > 0 ? text : [];

    return source.filter((entry) => entry.trim().length > 0);
  }, [text, texts]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (!showCursor) return undefined;

    const blinkMs = Math.max(120, Math.round(cursorBlinkDuration * 1000));
    const interval = window.setInterval(() => {
      setCursorVisible((previous) => !previous);
    }, blinkMs);

    return () => window.clearInterval(interval);
  }, [cursorBlinkDuration, showCursor]);

  useEffect(() => {
    if (phrases.length === 0) return undefined;

    const activePhrase = phrases[activeIndex % phrases.length] ?? '';
    const min = clampSpeed(variableSpeedMin, 60);
    const max = clampSpeed(variableSpeedMax, 120);
    const typeMs = clampSpeed(typingSpeed, 75);
    const deleteMs = clampSpeed(deletingSpeed, 50);
    const pauseMs = clampSpeed(pauseDuration, 1500);

    let timeout: number;

    if (!isDeleting && displayText.length < activePhrase.length) {
      const nextLength = displayText.length + 1;
      const nextDelay = variableSpeedEnabled
        ? randomBetween(min, max)
        : typeMs;

      timeout = window.setTimeout(() => {
        setDisplayText(activePhrase.slice(0, nextLength));
      }, nextDelay);
    } else if (!isDeleting && displayText.length === activePhrase.length) {
      if (!deletingEnabled) return undefined;
      timeout = window.setTimeout(() => {
        setIsDeleting(true);
      }, pauseMs);
    } else if (isDeleting && displayText.length > 0) {
      const nextLength = displayText.length - 1;
      const nextDelay = variableSpeedEnabled
        ? randomBetween(min, max)
        : deleteMs;

      timeout = window.setTimeout(() => {
        setDisplayText(activePhrase.slice(0, nextLength));
      }, nextDelay);
    } else {
      if (!loop && activeIndex >= phrases.length - 1) return undefined;
      timeout = window.setTimeout(() => {
        setIsDeleting(false);
        setActiveIndex((previous) => (previous + 1) % phrases.length);
      }, 80);
    }

    return () => window.clearTimeout(timeout);
  }, [
    activeIndex,
    deletingSpeed,
    displayText,
    isDeleting,
    pauseDuration,
    phrases,
    typingSpeed,
    variableSpeedEnabled,
    variableSpeedMax,
    variableSpeedMin,
    deletingEnabled,
    loop,
  ]);

  if (phrases.length === 0) return null;

  return (
    <span className={clsx('inline-flex items-center', className)} aria-live="polite">
      <span>{displayText}</span>
      {showCursor ? (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block select-none"
          style={{ opacity: cursorVisible ? 1 : 0 }}
        >
          {cursorCharacter}
        </span>
      ) : null}
    </span>
  );
}
