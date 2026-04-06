import clsx from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'easy' | 'medium' | 'hard' | 'bronze' | 'silver' | 'gold';

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
  bronze:
    'bg-gradient-to-r from-amber-700/20 to-orange-600/20 text-amber-800 ring-amber-400/60 dark:from-amber-800/30 dark:to-orange-700/30 dark:text-amber-300 dark:ring-amber-600/50',
  silver:
    'bg-gradient-to-r from-slate-300/40 to-gray-200/40 text-slate-700 ring-slate-400/60 dark:from-slate-500/30 dark:to-gray-500/30 dark:text-slate-200 dark:ring-slate-500/50',
  gold:
    'bg-gradient-to-r from-yellow-400/30 to-amber-300/30 text-yellow-800 ring-yellow-500/60 dark:from-yellow-500/30 dark:to-amber-400/30 dark:text-yellow-300 dark:ring-yellow-500/50',
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
