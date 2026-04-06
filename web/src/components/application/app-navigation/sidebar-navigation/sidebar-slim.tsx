'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import type { NavItemType } from '@/components/application/app-navigation/config';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/authStore';
import { DropdownOption, DropdownSelect, ThemeToggle } from '@/components/ui';

interface SidebarNavigationSlimProps {
  items: NavItemType[];
  footerItems?: NavItemType[];
  onNavigate?: () => void;
  onLogout?: () => Promise<void>;
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNavigationSlim({
  items,
  footerItems = [],
  onNavigate,
  onLogout,
}: SidebarNavigationSlimProps) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const userName = user?.name?.trim() || 'Student';
  const languageOptions: DropdownOption[] = [
    { value: 'en', label: t('language.english', 'English') },
    { value: 'am', label: t('language.amharic', 'Amharic') },
  ];

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-[var(--border-color)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-color)_96%,white),color-mix(in_srgb,var(--surface-muted)_58%,var(--surface-color)))] px-4 py-5">
      <div className="mb-5 flex shrink-0 items-center gap-2.5 px-1">
        <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl">
          <span className="text-base font-bold text-white">e</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{userName}</p>
          <p className="text-xs text-[var(--foreground)]/65">examprep</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {items.map((item) => {
          const Icon = item.icon;
          const sectionActive = isActive(pathname, item.href);

          return (
            <div
              key={item.href}
              className="rounded-2xl border border-[var(--border-color)]/70 bg-[var(--surface-color)]/86 p-2"
            >
              <Link
                href={item.href}
                onClick={onNavigate}
                className={clsx(
                  'ui-pill flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold transition',
                  sectionActive
                    ? 'bg-[color-mix(in_srgb,var(--accent-color)_16%,var(--surface-color))] text-[var(--accent-strong)]'
                    : 'text-[var(--foreground)]/80 hover:bg-[var(--surface-muted)]',
                )}
              >
                <span className="flex items-center gap-2">
                  {Icon ? (
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                  ) : (
                    <span className="h-4.5 w-4.5 shrink-0" />
                  )}
                  <span>{item.label}</span>
                </span>
                {typeof item.badge === 'number' ? (
                  <span className="rounded-full bg-[var(--accent-color)] px-2 py-0.5 text-[11px] font-semibold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>

              {item.items?.length ? (
                <div className="mt-1.5 space-y-1.5 pl-1">
                  {item.items.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const subActive = isActive(pathname, subItem.href);

                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={onNavigate}
                        className={clsx(
                          'ui-pill flex items-center justify-between rounded-xl px-2.5 py-2 text-sm transition',
                          subActive
                            ? 'border border-[var(--accent-color)]/50 bg-[color-mix(in_srgb,var(--accent-color)_12%,var(--surface-color))] text-[var(--accent-strong)]'
                            : 'text-[var(--foreground)]/70 hover:bg-[var(--surface-muted)]',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {SubIcon ? (
                            <SubIcon className="h-4 w-4 shrink-0" />
                          ) : (
                            <span className="h-4 w-4 shrink-0" />
                          )}
                          <span>{subItem.label}</span>
                        </span>
                        {typeof subItem.badge === 'number' ? (
                          <span className="rounded-full bg-[var(--accent-color)] px-2 py-0.5 text-[11px] font-semibold text-white">
                            {subItem.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-4 shrink-0 space-y-1.5 border-t border-[var(--border-color)]/70 pt-4">
        {footerItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                'ui-pill flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition',
                active
                  ? 'bg-[var(--surface-muted)] text-[var(--accent-strong)]'
                  : 'text-[var(--foreground)]/75 hover:bg-[var(--surface-muted)]',
              )}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="ui-dropdown-panel rounded-2xl p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--foreground)]">
              {t('language.label', 'Language')}
            </span>
            <ThemeToggle />
          </div>
          <DropdownSelect
            value={locale}
            options={languageOptions}
            onChange={(nextValue) => setLocale(nextValue as 'en' | 'am')}
            menuPlacement="top"
            className="mt-2"
            triggerClassName="h-9 px-3 text-xs"
            menuClassName="max-h-44"
          />
        </div>

        {onLogout ? (
          <button
            type="button"
            onClick={() => {
              void onLogout();
            }}
            className="ui-pill w-full rounded-xl border border-[var(--border-color)] px-2.5 py-2 text-left text-sm font-semibold text-[var(--foreground)]/85 transition hover:bg-[var(--surface-muted)]"
          >
            Log out
          </button>
        ) : null}
      </div>
    </aside>
  );
}
