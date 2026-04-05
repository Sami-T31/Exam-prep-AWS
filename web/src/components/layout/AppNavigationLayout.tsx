'use client';

import type { FC } from 'react';
import {
  BarChartSquare02,
  CheckDone01,
  ChevronRight,
  Grid03,
  HomeLine,
  LifeBuoy01,
  LineChartUp03,
  Package,
  PieChart03,
  Rows01,
  Settings01,
  Settings03,
  Star01,
  Users01,
} from '@untitledui/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { NavItemType } from '@/components/application/app-navigation/config';
import { SidebarNavigationSlim } from '@/components/application/app-navigation/sidebar-navigation/sidebar-slim';
import { useAuthStore } from '@/stores/authStore';
import { ProgressiveBlur } from '@/components/visual/ProgressiveBlur';

const publicRoutes = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]);

const navItemsDualTier: (NavItemType & { icon: FC<{ className?: string }> })[] =
  [
    {
      label: 'Home',
      href: '/dashboard',
      icon: HomeLine,
      items: [
        { label: 'Overview', href: '/dashboard', icon: Grid03 },
        { label: 'Subjects', href: '/subjects', icon: Rows01 },
        { label: 'Practice', href: '/practice', icon: CheckDone01 },
        { label: 'Mock Exams', href: '/mock-exams/subjects', icon: Package },
        { label: 'Bookmarks', href: '/bookmarks', icon: Star01 },
      ],
    },
    {
      label: 'Dashboard',
      href: '/progress',
      icon: BarChartSquare02,
      items: [
        { label: 'Progress', href: '/progress', icon: LineChartUp03 },
        { label: 'Leaderboard', href: '/leaderboard', icon: PieChart03 },
        { label: 'Subscription', href: '/account/subscription', icon: Users01 },
        { label: 'Privacy & Data', href: '/account/privacy', icon: Settings03 },
      ],
    },
    {
      label: 'Subscribe',
      href: '/subscribe',
      icon: Star01,
    },
  ];

function shouldUseSidebar(pathname: string | null): boolean {
  if (!pathname) return false;
  if (publicRoutes.has(pathname)) return false;
  return true;
}

export function AppNavigationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopPinned, setDesktopPinned] = useState(false);
  const [desktopHovered, setDesktopHovered] = useState(false);
  const hasSidebar = shouldUseSidebar(pathname);
  const desktopOpen = desktopPinned || desktopHovered;

  if (!hasSidebar) {
    return (
      <div className="relative min-h-screen">
        {children}
        <ProgressiveBlur position="bottom" height="34vh" />
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <div className="app-nav-layout relative min-h-screen">
      <button
        type="button"
        onClick={() => setMobileOpen((previous) => !previous)}
        className="ui-pill fixed left-4 top-4 z-[75] rounded-full border border-[var(--border-color)] bg-[var(--surface-color)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] shadow-sm lg:hidden"
      >
        {mobileOpen ? 'Close' : 'Menu'}
      </button>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[65] bg-black/35 lg:hidden"
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-[70] transform transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarNavigationSlim
          items={navItemsDualTier}
          footerItems={[
            {
              label: 'Support',
              href: '/mock-exams',
              icon: LifeBuoy01,
            },
            {
              label: 'Settings',
              href: '/account/privacy',
              icon: Settings01,
            },
          ]}
          onNavigate={() => setMobileOpen(false)}
          onLogout={handleLogout}
        />
      </div>

      <div
        className="group/sidebar hidden lg:block"
        onMouseEnter={() => setDesktopHovered(true)}
        onMouseLeave={() => setDesktopHovered(false)}
      >
        <div
          className="fixed inset-y-0 left-0 z-[70] transition-transform duration-250 ease-out"
          style={{
            transform: desktopOpen
              ? 'translateX(0)'
              : 'translateX(calc(-100% + 1.25rem))',
          }}
        >
          <SidebarNavigationSlim
            items={navItemsDualTier}
            footerItems={[
              {
                label: 'Support',
                href: '/mock-exams',
                icon: LifeBuoy01,
              },
              {
                label: 'Settings',
                href: '/account/privacy',
                icon: Settings01,
              },
            ]}
            onLogout={handleLogout}
          />

          <button
            type="button"
            onClick={() => setDesktopPinned((previous) => !previous)}
            className="ui-pill absolute right-[-0.95rem] top-6 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--foreground)] shadow-sm"
            aria-label={desktopPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            title={desktopPinned ? 'Unpin sidebar' : 'Pin sidebar'}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-200 ${desktopOpen ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>
        </div>
      </div>

      <div className="app-nav-content min-w-0 pt-14 lg:pt-0">
        {children}
      </div>
      <ProgressiveBlur position="bottom" height="34vh" />
    </div>
  );
}
