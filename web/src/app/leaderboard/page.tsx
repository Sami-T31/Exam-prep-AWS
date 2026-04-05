'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useSubjects, useLeaderboard } from '@/hooks';
import {
  Badge,
  BreadcrumbTrail,
  Button,
  Card,
  DropdownOption,
  DropdownSelect,
  EmptyState,
  PillNav,
  Skeleton,
} from '@/components/ui';

type LeaderboardPeriod = 'weekly' | 'monthly' | 'alltime';

function toTopPercent(rank: number, totalEntries: number): number {
  if (totalEntries <= 0) return 100;
  return Math.max(1, Math.ceil((rank / totalEntries) * 100));
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(
    null,
  );
  const [limit, setLimit] = useState(20);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const { data: subjects = [] } = useSubjects();
  const {
    data: leaderboard,
    isLoading,
    error: queryError,
    refetch,
  } = useLeaderboard(period, selectedSubjectId, limit);

  const error = queryError ? 'Unable to load leaderboard right now.' : '';
  const selectedSubjectName = useMemo(() => {
    if (!selectedSubjectId) return 'All subjects';
    return (
      subjects.find((subject) => subject.id === selectedSubjectId)?.name ??
      'Selected subject'
    );
  }, [selectedSubjectId, subjects]);
  const subjectOptions = useMemo<DropdownOption[]>(
    () => [
      { value: '', label: 'All subjects' },
      ...subjects.map((subject) => ({
        value: String(subject.id),
        label: subject.name,
      })),
    ],
    [subjects],
  );

  function getPeriodLabel(value: LeaderboardPeriod): string {
    if (value === 'weekly') return 'Weekly';
    if (value === 'monthly') return 'Monthly';
    return 'All-Time';
  }

  const periodItems = useMemo(
    () =>
      (['weekly', 'monthly', 'alltime'] as LeaderboardPeriod[]).map(
        (value) => ({
          key: value,
          label: getPeriodLabel(value),
          active: period === value,
          onClick: () => {
            setPeriod(value);
            setLimit(20);
          },
        }),
      ),
    [period],
  );

  return (
    <div className="min-h-screen bg-[var(--background)] page-gradient">
      <header className="sticky top-0 z-30 border-b border-[var(--border-color)] bg-[var(--background)]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-color)] shadow-md shadow-[color-mix(in_srgb,var(--accent-color)_25%,transparent)]">
              <span className="text-base font-bold text-white">e</span>
            </div>
            <span className="text-base font-semibold text-[var(--foreground)]">
              examprep
            </span>
          </Link>
          <button
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-[var(--foreground)]/65 transition-colors hover:text-[var(--foreground)]"
          >
            Log out
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <BreadcrumbTrail
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Leaderboard' },
          ]}
        />

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Leaderboard
          </h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            Compare your score with other students by period and subject.
          </p>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <PillNav items={periodItems} size="sm" />

          <DropdownSelect
            label="Subject"
            value={selectedSubjectId ? String(selectedSubjectId) : ''}
            options={subjectOptions}
            onChange={(nextValue) => {
              setSelectedSubjectId(nextValue ? Number(nextValue) : null);
              setLimit(20);
            }}
            className="sm:min-w-[240px]"
          />
        </div>

        {error && (
          <Card className="mb-6 border-red-200/70 bg-red-50/60">
            <p className="text-sm text-red-700">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </Card>
        )}

        <Card className="mb-5" padding="lg">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Your Rank
          </h2>
          {isLoading ? (
            <Skeleton className="mt-3 h-14 w-full" />
          ) : (
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-[var(--border-color)] p-3">
              <p className="text-sm text-[var(--foreground)]/80">
                {user?.name || 'You'}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="warning">
                  Rank {leaderboard?.currentUser.rank ?? '-'}
                </Badge>
                <Badge variant="default">
                  {leaderboard?.currentUser.score ?? 0} pts
                </Badge>
              </div>
            </div>
          )}
        </Card>

        <Card padding="lg">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            Rankings
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : !leaderboard || leaderboard.entries.length === 0 ? (
            <EmptyState
              title="No scores yet"
              description="Once attempts are recorded, rankings will appear here."
            />
          ) : (
            <div className="space-y-3">
              {leaderboard.entries.map((entry) => {
                const isCurrentUser = entry.userId === user?.id;
                const isExpanded = expandedUserId === entry.userId;
                const totalEntries = leaderboard.entries.length;
                const topPercent = toTopPercent(entry.rank, totalEntries);
                return (
                  <div
                    key={entry.userId}
                    className={`ui-dropdown-panel rounded-[26px] p-3.5 transition-all duration-200 hover:-translate-y-0.5 ${
                      isCurrentUser
                        ? 'border-[var(--accent-color)] bg-[var(--surface-muted)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-color)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedUserId(isExpanded ? null : entry.userId)
                      }
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={clsx(
                            'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                            entry.rank <= 3
                              ? 'bg-[var(--accent-color)] text-white shadow-md shadow-[color-mix(in_srgb,var(--accent-color)_24%,transparent)]'
                              : 'bg-[var(--surface-muted)] text-[var(--foreground)]',
                          )}
                        >
                          {entry.rank}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {entry.name}
                          </p>
                          <p className="text-xs text-[var(--foreground)]/65">
                            {entry.score} pts - {entry.accuracy}% accuracy
                          </p>
                        </div>
                        {isCurrentUser && <Badge variant="warning">You</Badge>}
                      </div>

                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--foreground)]/80">
                          {entry.score}
                        </p>
                        <svg
                          className={`h-4 w-4 text-[var(--foreground)]/65 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <LeaderboardDetailCard
                          label="Accuracy"
                          value={`${entry.accuracy}%`}
                        />
                        <LeaderboardDetailCard
                          label="Score"
                          value={`${entry.score}`}
                        />
                        <LeaderboardDetailCard
                          label="Rank"
                          value={`#${entry.rank}`}
                        />
                        <LeaderboardDetailCard
                          label="Period"
                          value={getPeriodLabel(period)}
                        />
                        <LeaderboardDetailCard
                          label="Subject"
                          value={selectedSubjectName}
                        />
                        <LeaderboardDetailCard
                          label="Leaderboard Edge"
                          value={`Top ${topPercent}%`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && leaderboard && leaderboard.entries.length >= limit && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setLimit((previous) => previous + 20)}
              >
                Load More
              </Button>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

function LeaderboardDetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="ui-dropdown-item rounded-[20px] px-3.5 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--foreground)]/60">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
