'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, type, className, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]/90">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            className={clsx(
              'w-full rounded-2xl border px-4 py-3 text-sm shadow-[0_6px_18px_color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-150',
              'bg-[var(--surface-color)] text-[var(--foreground)]',
              'placeholder:text-[var(--foreground)]/45',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              error
                ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                : 'border-[var(--border-color)] hover:border-[var(--accent-color)]/70 focus:border-[var(--accent-color)] focus:ring-[var(--accent-color)]/30 focus:shadow-[0_10px_22px_color-mix(in_srgb,var(--accent-color)_24%,transparent)]',
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--foreground)]/55 hover:text-[var(--foreground)]"
              tabIndex={-1}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
