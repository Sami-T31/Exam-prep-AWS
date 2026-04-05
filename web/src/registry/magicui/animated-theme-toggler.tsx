'use client';

import clsx from 'clsx';
import { useSyncExternalStore } from 'react';

const THEME_STORAGE_KEY = 'exam-prep-theme';

type ThemeMode = 'light' | 'dark';

function getThemeFromDom(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribeToThemeChanges(onStoreChange: () => void): () => void {
  const storageHandler = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const themeHandler = () => onStoreChange();

  window.addEventListener('storage', storageHandler);
  window.addEventListener('themechange', themeHandler as EventListener);

  return () => {
    window.removeEventListener('storage', storageHandler);
    window.removeEventListener('themechange', themeHandler as EventListener);
  };
}

function applyTheme(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function AnimatedThemeToggler({ className }: { className?: string }) {
  const theme = useSyncExternalStore(
    subscribeToThemeChanges,
    getThemeFromDom,
    () => 'light',
  );
  const isDark = theme === 'dark';

  function toggleTheme(): void {
    const nextTheme: ThemeMode = isDark ? 'light' : 'dark';
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event('themechange'));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={clsx(
        'relative inline-flex h-10 w-16 items-center rounded-full border border-[var(--border-color)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--surface-color)_95%,white),color-mix(in_srgb,var(--surface-muted)_68%,var(--surface-color)))] p-1 transition-colors duration-300',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'absolute left-1 top-1 h-8 w-8 rounded-full bg-[var(--surface-color)] shadow-[0_6px_14px_color-mix(in_srgb,var(--accent-color)_28%,transparent)] transition-transform duration-300',
          isDark ? 'translate-x-6' : 'translate-x-0',
        )}
      />

      <span className="pointer-events-none relative z-[1] flex w-full items-center justify-between px-1.5">
        <svg
          viewBox="0 0 24 24"
          className={clsx(
            'h-3.5 w-3.5 transition-opacity duration-200',
            isDark ? 'opacity-45' : 'opacity-100',
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 3.75v1.5M12 18.75v1.5M5.636 5.636l1.06 1.06M17.304 17.304l1.06 1.06M3.75 12h1.5M18.75 12h1.5M5.636 18.364l1.06-1.06M17.304 6.696l1.06-1.06" />
          <circle cx="12" cy="12" r="4.2" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          className={clsx(
            'h-3.5 w-3.5 transition-opacity duration-200',
            isDark ? 'opacity-100' : 'opacity-45',
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M20.2 14.8A8.5 8.5 0 019.2 3.8a8.5 8.5 0 1011 11z" />
        </svg>
      </span>
    </button>
  );
}

