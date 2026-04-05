'use client';

import { Fragment, ReactNode } from 'react';
import clsx from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <Fragment>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={clsx(
            'w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] p-6 shadow-2xl',
            sizeStyles[size],
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {title && (
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--foreground)]/60 transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </Fragment>
  );
}
