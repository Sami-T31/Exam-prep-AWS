'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent-color)] text-white shadow-md shadow-[color-mix(in_srgb,var(--accent-color)_24%,transparent)] hover:bg-[var(--accent-strong)] hover:shadow-[0_10px_24px_color-mix(in_srgb,var(--accent-color)_35%,transparent)] active:brightness-95',
  secondary:
    'bg-[var(--foreground)] text-[var(--background)] shadow-sm hover:opacity-90',
  outline:
    'border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-muted)] hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--accent-color)_20%,transparent)]',
  ghost:
    'text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
  danger: 'bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {isLoading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
