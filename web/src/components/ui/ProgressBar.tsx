import clsx from 'clsx';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'orange' | 'teal' | 'rose' | 'amber';
  showLabel?: boolean;
  className?: string;
}

const sizeStyles = { sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' };

const colorStyles = {
  orange: 'bg-[var(--accent-color)]',
  teal: 'bg-[var(--accent-color)]',
  rose: 'bg-[var(--accent-color)]',
  amber: 'bg-[var(--accent-color)]',
};

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'orange',
  showLabel = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={clsx('w-full', className)}>
      {showLabel && (
        <div className="mb-1.5 flex justify-between text-xs font-medium">
          <span className="text-[var(--foreground)]/75">Progress</span>
          <span className="font-mono text-[var(--foreground)]">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={clsx('w-full overflow-hidden rounded-full bg-[var(--surface-muted)]', sizeStyles[size])}>
        <div
          className={clsx('rounded-full transition-all duration-700 ease-out', sizeStyles[size], colorStyles[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
