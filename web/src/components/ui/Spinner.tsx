import clsx from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={clsx('animate-spin text-[var(--accent-color)]', sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={clsx('animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--surface-muted)_82%,white)] dark:bg-[color-mix(in_srgb,var(--surface-muted)_82%,black)]', className)} />
  );
}
