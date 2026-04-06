'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSubjects, useLeaderboard } from '@/hooks';
import type { LeaderboardTier, LeaderboardBadge, LeaderboardReward } from '@/hooks/useLeaderboard';
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

function getTierFromRank(rank: number, totalEntries: number): LeaderboardTier {
  const percentile = (rank / Math.max(totalEntries, 1)) * 100;
  if (percentile <= 10) return 'gold';
  if (percentile <= 30) return 'silver';
  return 'bronze';
}

function getTierLabel(tier: LeaderboardTier): string {
  switch (tier) {
    case 'gold': return 'Gold';
    case 'silver': return 'Silver';
    case 'bronze': return 'Bronze';
  }
}

function getTierIcon(tier: LeaderboardTier): string {
  switch (tier) {
    case 'gold': return '🥇';
    case 'silver': return '🥈';
    case 'bronze': return '🥉';
  }
}

function RankChangeIndicator({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-[var(--foreground)]/50">
        <span className="text-[10px]">—</span>
      </span>
    );
  }
  
  const isPositive = change > 0;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      )}
    >
      <svg
        className={clsx('h-3 w-3', !isPositive && 'rotate-180')}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
          clipRule="evenodd"
        />
      </svg>
      {Math.abs(change)}
    </span>
  );
}

function ScoreChangeIndicator({ change }: { change: number }) {
  if (change === 0) return null;
  
  const isPositive = change > 0;
  return (
    <span
      className={clsx(
        'text-xs font-medium',
        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      )}
    >
      {isPositive ? '+' : ''}{change} pts
    </span>
  );
}

function TierBadge({ tier }: { tier: LeaderboardTier }) {
  return (
    <Badge variant={tier} className="gap-1">
      <span>{getTierIcon(tier)}</span>
      <span>{getTierLabel(tier)}</span>
    </Badge>
  );
}

function BadgeDisplay({ badges }: { badges: LeaderboardBadge[] }) {
  if (badges.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.id}
          title={badge.description}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs"
        >
          <span>{badge.icon}</span>
          <span className="text-[var(--foreground)]/70">{badge.name}</span>
        </span>
      ))}
    </div>
  );
}

function RewardCard({ reward }: { reward: LeaderboardReward }) {
  if (reward.type === 'badge' && reward.badge) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-3">
        <span className="text-2xl">{reward.badge.icon}</span>
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{reward.badge.name}</p>
          <p className="text-xs text-[var(--foreground)]/60">{reward.badge.description}</p>
        </div>
      </div>
    );
  }
  
  if (reward.type === 'streak_boost') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-800/40 dark:bg-amber-950/20">
        <span className="text-2xl">🔥</span>
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Streak Boost</p>
          <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
            +{reward.streakBoostDays} days added to your streak
          </p>
        </div>
      </div>
    );
  }
  
  return null;
}

function StreakDisplay({ streak }: { streak: number }) {
  if (streak === 0) return null;
  
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
      <span>🔥</span>
      {streak} day{streak !== 1 ? 's' : ''}
    </span>
  );
}

export default function LeaderboardPage() {
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

  const currentUserTier = useMemo(() => {
    if (!leaderboard?.currentUser.rank || !leaderboard.entries.length) return 'bronze';
    return leaderboard.currentUser.tier ?? getTierFromRank(
      leaderboard.currentUser.rank,
      leaderboard.entries.length
    );
  }, [leaderboard]);

  const currentUserRankChange = leaderboard?.currentUser.rankChange ?? 0;
  const currentUserScoreChange = leaderboard?.currentUser.scoreChange ?? 0;
  const currentUserStreak = leaderboard?.currentUser.streak ?? 0;
  const currentUserBadges = leaderboard?.currentUser.badges ?? [];
  const currentUserRewards = leaderboard?.currentUser.rewards ?? [];

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
              window.location.href = '/login?fromLogout=1';
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
            Track your progress, earn rewards, and climb the ranks.
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
            Your Standing
          </h2>
          {isLoading ? (
            <Skeleton className="mt-3 h-24 w-full" />
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)]">
                    <span className="text-lg font-bold text-[var(--foreground)]">
                      {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {user?.name || 'You'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <TierBadge tier={currentUserTier} />
                      {currentUserStreak > 0 && <StreakDisplay streak={currentUserStreak} />}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col items-center rounded-xl bg-[var(--surface-muted)] px-4 py-2">
                    <span className="text-xs text-[var(--foreground)]/60">Rank</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-bold text-[var(--foreground)]">
                        #{leaderboard?.currentUser.rank ?? '-'}
                      </span>
                      <RankChangeIndicator change={currentUserRankChange} />
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center rounded-xl bg-[var(--surface-muted)] px-4 py-2">
                    <span className="text-xs text-[var(--foreground)]/60">Score</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-bold text-[var(--foreground)]">
                        {leaderboard?.currentUser.score ?? 0}
                      </span>
                      <ScoreChangeIndicator change={currentUserScoreChange} />
                    </div>
                  </div>
                </div>
              </div>

              {currentUserBadges.length > 0 && (
                <div className="rounded-2xl border border-[var(--border-color)] p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/60">
                    Your Badges
                  </p>
                  <BadgeDisplay badges={currentUserBadges} />
                </div>
              )}
            </div>
          )}
        </Card>

        {currentUserRewards.length > 0 && (
          <Card className="mb-5" padding="lg">
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
              Recent Rewards
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {currentUserRewards.map((reward, index) => (
                <RewardCard key={index} reward={reward} />
              ))}
            </div>
          </Card>
        )}

        <Card padding="lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Rankings
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-300" />
                <span className="text-xs text-[var(--foreground)]/60">Gold</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-slate-300 to-gray-200" />
                <span className="text-xs text-[var(--foreground)]/60">Silver</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-amber-700 to-orange-600" />
                <span className="text-xs text-[var(--foreground)]/60">Bronze</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
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
                const entryTier = entry.tier ?? getTierFromRank(entry.rank, totalEntries);
                const entryRankChange = entry.rankChange ?? 0;
                const entryScoreChange = entry.scoreChange ?? 0;
                const entryStreak = entry.streak ?? 0;
                const entryBadges = entry.badges ?? [];
                
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
                            'inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold',
                            entry.rank === 1
                              ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30'
                              : entry.rank === 2
                              ? 'bg-gradient-to-br from-slate-300 to-gray-400 text-white shadow-lg shadow-slate-200/50 dark:shadow-slate-700/30'
                              : entry.rank === 3
                              ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30'
                              : 'bg-[var(--surface-muted)] text-[var(--foreground)]',
                          )}
                        >
                          {entry.rank}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              {entry.name}
                            </p>
                            {isCurrentUser && <Badge variant="warning">You</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <TierBadge tier={entryTier} />
                            {entryStreak > 0 && <StreakDisplay streak={entryStreak} />}
                            <RankChangeIndicator change={entryRankChange} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {entry.score} pts
                          </p>
                          <ScoreChangeIndicator change={entryScoreChange} />
                        </div>
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
                      <div className="mt-4 space-y-3">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <LeaderboardDetailCard
                            label="Total Score"
                            value={`${entry.score} pts`}
                          />
                          <LeaderboardDetailCard
                            label="Rank"
                            value={`#${entry.rank}`}
                            subvalue={entryRankChange !== 0 ? `${entryRankChange > 0 ? '+' : ''}${entryRankChange} from last period` : undefined}
                          />
                          <LeaderboardDetailCard
                            label="Leaderboard Edge"
                            value={`Top ${topPercent}%`}
                          />
                          <LeaderboardDetailCard
                            label="Improvement"
                            value={entryScoreChange !== 0 ? `${entryScoreChange > 0 ? '+' : ''}${entryScoreChange} pts` : 'No change'}
                            positive={entryScoreChange > 0}
                            negative={entryScoreChange < 0}
                          />
                        </div>
                        
                        {entryBadges.length > 0 && (
                          <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/60">
                              Achievements
                            </p>
                            <BadgeDisplay badges={entryBadges} />
                          </div>
                        )}
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
  subvalue,
  positive,
  negative,
}: {
  label: string;
  value: string;
  subvalue?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="ui-dropdown-item rounded-[20px] px-3.5 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--foreground)]/60">
        {label}
      </p>
      <p
        className={clsx(
          'mt-1 text-lg font-semibold',
          positive && 'text-emerald-600 dark:text-emerald-400',
          negative && 'text-red-600 dark:text-red-400',
          !positive && !negative && 'text-[var(--foreground)]'
        )}
      >
        {value}
      </p>
      {subvalue && (
        <p className="mt-0.5 text-xs text-[var(--foreground)]/50">{subvalue}</p>
      )}
    </div>
  );
}
