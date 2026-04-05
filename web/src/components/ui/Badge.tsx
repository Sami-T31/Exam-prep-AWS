import clsx from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'easy' | 'medium' | 'hard';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-[var(--surface-muted)] text-[var(--foreground)] ring-[var(--border-color)] shadow-sm shadow-[color-mix(in_srgb,var(--accent-color)_12%,transparent)]',
  success:
    'bg-[color-mix(in_srgb,var(--accent-color)_18%,white)] text-[var(--accent-strong)] ring-[color-mix(in_srgb,var(--accent-color)_45%,var(--border-color))] shadow-sm shadow-[color-mix(in_srgb,var(--accent-color)_16%,transparent)]',
  warning:
    'bg-[color-mix(in_srgb,var(--accent-color)_24%,white)] text-[var(--accent-strong)] ring-[color-mix(in_srgb,var(--accent-color)_60%,var(--border-color))] shadow-sm shadow-[color-mix(in_srgb,var(--accent-color)_20%,transparent)]',
  danger:
    'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800',
  info:
    'bg-[color-mix(in_srgb,var(--surface-muted)_72%,white)] text-[var(--foreground)] ring-[var(--border-color)] shadow-sm shadow-[color-mix(in_srgb,var(--accent-color)_14%,transparent)]',
  easy:
    'bg-[color-mix(in_srgb,var(--accent-color)_18%,white)] text-[var(--accent-strong)] ring-[color-mix(in_srgb,var(--accent-color)_45%,var(--border-color))]',
  medium:
    'bg-[color-mix(in_srgb,var(--accent-color)_24%,white)] text-[var(--accent-strong)] ring-[color-mix(in_srgb,var(--accent-color)_60%,var(--border-color))]',
  hard:
    'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-all duration-200',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
