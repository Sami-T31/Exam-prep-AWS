'use client';

import { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  padding = 'md',
  hoverable = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      data-ui-card="true"
      className={clsx(
        'group relative isolate overflow-hidden rounded-3xl border border-[var(--border-color)]',
        'bg-[var(--edu-hero-bg)]',
        'transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent-color)_72%,var(--border-color))]',
        hoverable &&
          'hover:shadow-[0_18px_38px_color-mix(in_srgb,var(--accent-color)_24%,transparent)]',
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
