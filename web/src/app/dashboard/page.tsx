'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/authStore';
import { useOverallStats, useSubjectStats, useMockExams } from '@/hooks';
import TextType from '@/components/visual/TextType';
import AnimatedCounter from '@/components/visual/AnimatedCounter';
import {
  Button,
  Card,
  EmptyState,
  PillNav,
  ProgressBar,
  Skeleton,
} from '@/components/ui';

interface ContinueState {
  subjectId: number;
  subjectName: string;
  gradeId: number;
  gradeNumber: number;
  topicId: number;
  topicName: string;
}

const dashboardNavItems = [
  {
    label: 'Mock Exams',
    href: '/mock-exams/subjects',
    matchPrefixes: ['/mock-exams'],
  },
  { label: 'Subjects', href: '/subjects', matchPrefixes: ['/subjects'] },
  { label: 'Progress', href: '/progress', matchPrefixes: ['/progress'] },
  { label: 'Bookmarks', href: '/bookmarks', matchPrefixes: ['/bookmarks'] },
  {
    label: 'Leaderboard',
    href: '/leaderboard',
    matchPrefixes: ['/leaderboard'],
  },
  { label: 'Subscribe', href: '/subscribe', matchPrefixes: ['/subscribe'] },
  {
    label: 'Subscription Status',
    href: '/account/subscription',
    matchPrefixes: ['/account/subscription'],
  },
  {
    label: 'Privacy & Data',
    href: '/account/privacy',
    matchPrefixes: ['/account/privacy'],
  },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const [continueState, setContinueState] = useState<ContinueState | null>(
    null,
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const raw = window.localStorage.getItem('lastLearningContext');
      if (!raw) return;

      try {
        setContinueState(JSON.parse(raw) as ContinueState);
      } catch {
        setContinueState(null);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const {
    data: overallStats,
    isLoading: statsLoading,
    error: statsError,
    refetch,
  } = useOverallStats();
  const { data: subjectStats = [] } = useSubjectStats();
  const { data: allMockExams = [] } = useMockExams();

  const activeSubjectStats = useMemo(
    () => subjectStats.filter((subject) => subject.totalAttempts > 0),
    [subjectStats],
  );

  const isLoading = statsLoading;
  const error = statsError
    ? t(
        'dashboard.loadError',
        'Unable to load dashboard data right now. Please try again.',
      )
    : '';
  const mockExams = allMockExams.slice(0, 3);
  const welcomeName = user?.name?.trim() || 'Student';
  const welcomeHeading = `${t('dashboard.welcomeBack', 'Welcome back')}, ${welcomeName}`;
  const welcomeMessages = useMemo(
    () => [
      'Your dashboard is ready. Keep building your streak one chapter at a time.',
      'Focus on one weak area today and convert it into a strength.',
      'Consistency beats intensity. A few strong sessions today goes a long way.',
    ],
    [],
  );

  return (
    <div className="emerald-preview min-h-screen bg-[var(--background)]">
      <header className="edu-topbar sticky top-0 z-30 border-b backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/35 bg-white/15">
              <span className="text-base font-bold text-white">e</span>
            </div>
            <span className="text-base font-semibold text-white">examprep</span>
          </Link>
          <button
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-amber-50 transition-colors hover:text-white"
          >
            {t('common.logOut', 'Log out')}
          </button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-8 py-10">
        <section className="edu-hero px-6 py-6">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)]">
            <TextType
              key={welcomeHeading}
              text={[welcomeHeading]}
              texts={[welcomeHeading]}
              typingSpeed={64}
              pauseDuration={1500}
              showCursor={false}
              cursorCharacter="_"
              deletingSpeed={50}
              deletingEnabled={false}
              loop={false}
              variableSpeedEnabled={false}
              variableSpeedMin={60}
              variableSpeedMax={120}
              cursorBlinkDuration={0.5}
            />
          </h1>
          <p className="mt-2 text-base text-[var(--foreground)]/75">
            <TextType
              key={welcomeName}
              text={welcomeMessages}
              texts={welcomeMessages}
              typingSpeed={75}
              pauseDuration={3800}
              showCursor
              cursorCharacter="_"
              deletingSpeed={50}
              variableSpeedEnabled={false}
              variableSpeedMin={60}
              variableSpeedMax={120}
              cursorBlinkDuration={0.5}
            />
          </p>

          <PillNav items={[...dashboardNavItems]} className="mt-5 max-w-5xl" />
        </section>

        {error && (
          <Card className="mt-6 border-red-200/70 bg-red-50/60">
            <p className="text-sm text-red-700">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void refetch()}
            >
              {t('common.retry', 'Retry')}
            </Button>
          </Card>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={t('dashboard.answeredToday', 'Answered Today')}
            value={
              isLoading ? '--' : <AnimatedCounter value={overallStats?.todayAttempts ?? 0} />
            }
            hint={t(
              'dashboard.questionsLast24h',
              'Questions answered in the last 24h',
            )}
          />
          <StatCard
            title={t('dashboard.overallAccuracy', 'Overall Accuracy')}
            value={
              isLoading ? '--' : (
                <AnimatedCounter
                  value={overallStats?.accuracy ?? 0}
                  decimals={2}
                  suffix="%"
                />
              )
            }
            hint={t('dashboard.acrossAllSubjects', 'Across all subjects')}
          />
          <StatCard
            title={t('dashboard.currentStreak', 'Current Streak')}
            value={
              isLoading ? '--' : (
                <AnimatedCounter
                  value={overallStats?.currentStreak ?? 0}
                  suffix=" days"
                />
              )
            }
            hint={t(
              'dashboard.consecutiveActiveDays',
              'Consecutive active days',
            )}
          />
          <StatCard
            title={t('dashboard.strongestSubject', 'Strongest Subject')}
            value={
              isLoading
                ? '--'
                : (activeSubjectStats[0]?.subjectName ??
                  t('dashboard.noData', 'No data'))
            }
            hint={t(
              'dashboard.highestAttemptVolume',
              'Highest attempt volume so far',
            )}
          />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2" padding="lg">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              Continue Learning
            </h2>
            <p className="mt-1 text-sm text-[var(--foreground)]/75">
              Jump back into your recent subject and topic.
            </p>

            {continueState ? (
              <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--edu-hero-bg)] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
                  Last topic
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                  {continueState.subjectName} - Grade{' '}
                  <AnimatedCounter value={continueState.gradeNumber} />
                </p>
                <p className="mt-1 text-sm text-[var(--foreground)]/75">
                  {continueState.topicName}
                </p>
                <Link
                  href={`/subjects/${continueState.subjectId}/topics?grade=${continueState.gradeId}&focus=${continueState.topicId}`}
                  className="mt-4 inline-flex rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] hover:opacity-90"
                >
                  Continue
                </Link>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="No recent activity yet"
                  description="Start by choosing a subject to build your learning path."
                  action={
                    <Link
                      href="/subjects"
                      className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
                    >
                      Browse subjects
                    </Link>
                  }
                />
              </div>
            )}
          </Card>

          <Card padding="lg">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              Upcoming Mock Exams
            </h2>
            <p className="mt-1 text-sm text-[var(--foreground)]/75">
              Suggestions based on available exams.
            </p>

            <div className="mt-4 space-y-3">
              {isLoading && (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              )}
              {!isLoading && mockExams.length === 0 && (
                <p className="text-sm text-[var(--foreground)]/70">
                  No mock exams available yet.
                </p>
              )}
              {mockExams.map((exam) => (
                <div
                  key={exam.id}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--edu-hero-bg)] p-3"
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {exam.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--foreground)]/65">
                    {exam.subject.name} - Grade{' '}
                    <AnimatedCounter value={exam.grade.gradeNumber} /> -{' '}
                    <AnimatedCounter value={exam.durationMinutes} suffix=" min" />
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-6">
          <Card padding="lg">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                Subject Progress
              </h2>
              <Link
                href="/subjects"
                className="text-sm font-semibold text-[var(--accent-strong)] hover:opacity-80"
              >
                Open subjects
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading && (
                <>
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </>
              )}
              {!isLoading && activeSubjectStats.length === 0 && (
                <p className="text-sm text-[var(--foreground)]/70">
                  No attempts yet. Start with any subject.
                </p>
              )}
              {activeSubjectStats.slice(0, 9).map((subject) => (
                <div
                  key={subject.subjectId}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--edu-hero-bg)] p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {subject.subjectName}
                    </p>
                    <p className="text-xs text-[var(--foreground)]/65">
                      <AnimatedCounter
                        value={subject.coverage}
                        decimals={2}
                        suffix="% covered"
                      />
                    </p>
                  </div>
                  <ProgressBar
                    value={subject.coverage}
                    color="teal"
                    size="sm"
                    className="mt-2"
                  />
                  <p className="mt-1 text-xs text-[var(--foreground)]/65">
                    <AnimatedCounter
                      value={subject.accuracy}
                      decimals={2}
                      suffix="% accuracy"
                    />{' '}
                    -{' '}
                    <AnimatedCounter
                      value={subject.totalAttempts}
                      suffix={` attempt${subject.totalAttempts === 1 ? '' : 's'}`}
                    />
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: ReactNode;
  hint: string;
}) {
  return (
    <Card padding="md">
      <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--foreground)]/65">{hint}</p>
    </Card>
  );
}
