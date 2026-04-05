'use client';

import clsx from 'clsx';

interface ProgressiveBlurProps {
  position?: 'top' | 'bottom';
  height?: string;
  className?: string;
}

export function ProgressiveBlur({
  position = 'bottom',
  height = '28vh',
  className,
}: ProgressiveBlurProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        'pointer-events-none fixed inset-x-0 z-20',
        position === 'bottom' ? 'bottom-0' : 'top-0',
        className,
      )}
      style={{ height }}
    >
      <div
        className={clsx(
          'progressive-blur absolute inset-0',
          position === 'bottom' ? 'progressive-blur--bottom' : 'progressive-blur--top',
        )}
      />
    </div>
  );
}
