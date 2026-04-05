'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { ReactNode } from 'react';

export interface BreadcrumbTrailItem {
  label: ReactNode;
  href?: string;
  key?: string;
}

interface BreadcrumbTrailProps {
  items: BreadcrumbTrailItem[];
  className?: string;
}

export function BreadcrumbTrail({ items, className }: BreadcrumbTrailProps) {
  const visibleItems = items.filter((item) => !!item.label);

  if (visibleItems.length === 0) return null;

  return (
    <nav className={clsx('mb-6', className)} aria-label="Breadcrumb">
      <ol className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[var(--border-color)]/82 bg-[color-mix(in_srgb,var(--surface-color)_94%,white)] px-2 py-1.5 shadow-[0_12px_24px_color-mix(in_srgb,var(--accent-color)_10%,transparent)]">
        {visibleItems.map((item, index) => (
          <li
            key={item.key ?? `${index}`}
            className="inline-flex items-center gap-2"
          >
            {index > 0 && (
              <span className="text-xs text-[var(--accent-color)]/80">/</span>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="rounded-full border border-transparent px-3 py-1 text-sm font-medium text-[var(--foreground)]/72 transition hover:border-[var(--border-color)] hover:bg-[var(--surface-muted)]/54 hover:text-[var(--foreground)]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="rounded-full border border-[var(--border-color)]/86 bg-[var(--surface-muted)]/56 px-3 py-1 text-sm font-semibold text-[var(--foreground)]">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
