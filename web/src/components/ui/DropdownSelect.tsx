'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  label?: string;
  value: string;
  options: DropdownOption[];
  onChange: (nextValue: string) => void;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  menuPlacement?: 'top' | 'bottom';
}

export function DropdownSelect({
  label,
  value,
  options,
  onChange,
  className,
  triggerClassName,
  menuClassName,
  menuPlacement = 'bottom',
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel =
    options.find((option) => option.value === value)?.label ??
    options[0]?.label ??
    '';

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    window.addEventListener('mousedown', handleDocumentClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleDocumentClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={clsx('relative', isOpen ? 'z-[90]' : 'z-10', className)}
    >
      {label ? (
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]/65">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className={clsx(
          'ui-pill flex h-12 w-full items-center justify-between rounded-full border border-[var(--border-color)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--surface-color)_92%,white),color-mix(in_srgb,var(--surface-muted)_54%,var(--surface-color)))] px-5 text-left text-sm font-semibold text-[var(--foreground)] shadow-[0_10px_24px_color-mix(in_srgb,var(--accent-color)_12%,transparent)]',
          triggerClassName,
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedLabel}</span>
        <span className="ml-3 text-[var(--accent-strong)]/85" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen ? (
        <div
          role="listbox"
          className={clsx(
            'ui-dropdown-panel ui-dropdown-menu absolute left-0 right-0 z-[95] max-h-72 overflow-y-auto rounded-2xl p-1.5',
            menuPlacement === 'bottom'
              ? 'top-[calc(100%+0.55rem)]'
              : 'bottom-[calc(100%+0.55rem)]',
            menuClassName,
          )}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`ui-pill flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  isSelected
                    ? 'bg-[color-mix(in_srgb,var(--accent-color)_18%,var(--surface-color))] font-semibold text-[var(--accent-strong)]'
                    : 'text-[var(--foreground)]/80 hover:bg-[var(--surface-muted)]'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
