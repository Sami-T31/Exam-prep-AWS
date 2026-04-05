import type { FC } from 'react';

export type NavIconType = FC<{ className?: string }>;

export interface NavItemType {
  label: string;
  href: string;
  icon?: NavIconType;
  badge?: number;
  items?: NavItemType[];
}

