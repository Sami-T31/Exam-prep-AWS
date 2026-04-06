'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/authStore';
import { getSubjectColor } from '@/lib/subjectColors';
import {
  useOverallStats,
  useSubjectStats,
  useDailyTrend,
  useWeakTopics,
  useGradeStats,
  useGradeDetailStats,
  useSubjectDetailStats,
} from '@/hooks';
import {
  BreadcrumbTrail,
  Button,
  Card,
  EmptyState,
  Modal,
  PillNav,
  ProgressBar,
  Skeleton,
} from '@/components/ui';
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

const ProgressChart = dynamic(() => import('./ProgressChart'), {
  loading: () => <Skeleton className="h-72 w-full" />,
  ssr: false,
});

const LOADING_MESSAGES = [
  'Loading your progress dashboard...',
  'Analyzing your results...',
  'Finding your strengths and weaknesses...',
  'Gathering your results...',
] as const;
const MIN_LOADING_SPLASH_MS = 2800;

const DAILY_GOAL_TARGET = 20;
const DONUT_INNER_ACTIVE = '#c49a6c';
const DONUT_INNER_MUTED = '#ebe0cf';
const DONUT_OUTER_COLORS = [
  '#c49a6c',
  '#d0a97c',
  '#b98658',
  '#a87347',
  '#8f6132',
  '#ddc4a8',
] as const;
const RECENT_ACTIVITY_DAY_COLORS: Record<string, string> = {
  Sun: '#c49a6c',
  Mon: '#6c8aa6',
  Tue: '#7f9d69',
  Wed: '#bf7a61',
  Thu: '#9371ab',
  Fri: '#5f8d81',
  Sat: '#d0a97c',
};
const RECENT_ACTIVITY_IDLE = '#e7d7c3';

interface SubjectStat {
  subjectId: number;
  subjectName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  coverage: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
}

interface GradeStat {
  gradeId: number;
  gradeNumber: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
}

interface GradeDetailStat {
  subjectId: number;
  subjectName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  coverage: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
}

interface StrengthChartPoint {
  subject: string;
  fullSubject: string;
  accuracy: number;
  coverage: number;
  practiceDepth: number;
  attempts: number;
}

interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color: string;
  detail?: string;
}

interface DonutView {
  id: string;
  label: string;
  centerTitle: string;
  centerValue: string;
  centerHint: string;
  scaleHint: string;
  helperText: string;
  legendTitle: string;
  innerData: DonutSlice[];
  outerData: DonutSlice[];
}

interface GaugeRing extends DonutSlice {
  category: string;
  fill: string;
}

interface RadialGaugeTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: GaugeRing;
  }>;
}

function ProgressLoadingSplash({
  message,
  progress,
}: {
  message: string;
  progress: number;
}) {
  return (
    <div className="emerald-preview min-h-screen overflow-x-clip bg-[var(--background)]">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
        <div className="loading-container w-full max-w-xl">
          <div className="loading-spinner-large" aria-hidden>
            <div className="spinner-ring" />
            <div className="spinner-ring" />
            <div className="spinner-ring" />
          </div>
          <div className="loading-text">
            <h3>{message}</h3>
            <p className="loading-progress-number">{Math.round(progress)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function ProgressPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { t } = useI18n();

  const {
    data: overallStats,
    isLoading: statsLoading,
    error: statsError,
    refetch,
  } = useOverallStats();
  const { data: subjectStats = [] } = useSubjectStats();
  const { data: trend = [] } = useDailyTrend(14);
  const { data: weakTopics = [] } = useWeakTopics(60, 5);
  const { data: gradeStats = [] } = useGradeStats();

  const isLoading = statsLoading;
  const error = statsError ? 'Unable to load progress data. Please retry.' : '';

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectStat | null>(
    null,
  );
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<GradeStat | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [isMinimumLoadingElapsed, setIsMinimumLoadingElapsed] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const {
    data: selectedSubjectTopics = [],
    isLoading: isLoadingSubjectTopics,
    error: subjectTopicsError,
  } = useSubjectDetailStats(selectedSubject?.subjectId ?? null);

  const {
    data: selectedGradeSubjects = [],
    isLoading: isLoadingGradeSubjects,
    error: gradeSubjectsError,
  } = useGradeDetailStats(selectedGrade?.gradeId ?? null);

  const subjectModalError = subjectTopicsError
    ? 'Unable to load subject breakdown right now.'
    : '';
  const gradeModalError = gradeSubjectsError
    ? 'Unable to load grade breakdown right now.'
    : '';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsMinimumLoadingElapsed(true);
    }, MIN_LOADING_SPLASH_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) return;

    const interval = window.setInterval(() => {
      setLoadingMessageIndex(
        (previous) => (previous + 1) % LOADING_MESSAGES.length,
      );
    }, 1650);

    return () => {
      window.clearInterval(interval);
    };
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const completeTimer = window.setTimeout(() => {
        setLoadingProgress(100);
      }, 0);
      return () => {
        window.clearTimeout(completeTimer);
      };
    }

    const kickoffTimer = window.setTimeout(() => {
      setLoadingProgress((previous) => (previous >= 90 ? 24 : previous + 18));
    }, 0);
    const interval = window.setInterval(() => {
      setLoadingProgress((previous) => (previous >= 90 ? 24 : previous + 8));
    }, 650);

    return () => {
      window.clearTimeout(kickoffTimer);
      window.clearInterval(interval);
    };
  }, [isLoading]);

  const activeSubjectStats = useMemo(
    () => subjectStats.filter((subject) => subject.totalAttempts > 0),
    [subjectStats],
  );

  const strengthChartData = useMemo<StrengthChartPoint[]>(() => {
    const chartSubjects = [...activeSubjectStats]
      .sort((left, right) => right.totalAttempts - left.totalAttempts)
      .slice(0, 6);
    const maxAttempts = Math.max(
      1,
      ...chartSubjects.map((subject) => subject.totalAttempts),
    );

    return chartSubjects.map((subject) => ({
      subject: formatStrengthAxisLabel(subject.subjectName),
      fullSubject: subject.subjectName,
      accuracy: Math.max(0, Math.min(100, subject.accuracy)),
      coverage: Math.max(0, Math.min(100, subject.coverage)),
      practiceDepth: Math.round((subject.totalAttempts / maxAttempts) * 100),
      attempts: subject.totalAttempts,
    }));
  }, [activeSubjectStats]);

  function openSubjectModal(subject: SubjectStat) {
    setSelectedSubject(subject);
    setIsSubjectModalOpen(true);
  }

  function openGradeModal(grade: GradeStat) {
    setSelectedGrade(grade);
    setIsGradeModalOpen(true);
  }

  const subjectCorrectPercent = selectedSubject?.accuracy ?? 0;
  const subjectIncorrectPercent = Math.max(
    0,
    Math.round((100 - subjectCorrectPercent) * 100) / 100,
  );
  const selectedSubjectIncorrectAttempts = selectedSubject
    ? Math.max(
        0,
        selectedSubject.totalAttempts - selectedSubject.correctAttempts,
      )
    : 0;

  const activeGradeSubjects = useMemo(
    () => selectedGradeSubjects.filter((subject) => subject.totalAttempts > 0),
    [selectedGradeSubjects],
  );

  const selectedGradeTotals = useMemo(() => {
    return selectedGradeSubjects.reduce(
      (accumulator, subject) => ({
        totalAttempts: accumulator.totalAttempts + subject.totalAttempts,
        correctAttempts: accumulator.correctAttempts + subject.correctAttempts,
      }),
      { totalAttempts: 0, correctAttempts: 0 },
    );
  }, [selectedGradeSubjects]);

  const selectedGradeOverallAccuracy =
    selectedGradeTotals.totalAttempts > 0
      ? Math.round(
          (selectedGradeTotals.correctAttempts /
            selectedGradeTotals.totalAttempts) *
            10000,
        ) / 100
      : 0;

  const overallAccuracyPercent = Math.max(
    0,
    Math.min(100, overallStats?.accuracy ?? 0),
  );
  const overallAccuracyLabel = formatPercentLabel(overallAccuracyPercent);
  const dailyGoalProgress = overallStats?.todayAttempts ?? 0;
  const dailyGoalPercent = Math.max(
    0,
    Math.min(100, Math.round((dailyGoalProgress / DAILY_GOAL_TARGET) * 100)),
  );
  const totalAttempts = overallStats?.totalAttempts ?? 0;
  const correctAttempts = overallStats?.correctAttempts ?? 0;
  const incorrectAttempts = Math.max(0, totalAttempts - correctAttempts);
  const totalQuestionBank = subjectStats.reduce(
    (sum, subject) => sum + subject.totalQuestions,
    0,
  );
  const totalCoveredQuestions = subjectStats.reduce(
    (sum, subject) => sum + subject.attemptedQuestions,
    0,
  );
  const totalRemainingQuestions = Math.max(
    0,
    totalQuestionBank - totalCoveredQuestions,
  );
  const overallCoveragePercent =
    totalQuestionBank > 0
      ? Math.round((totalCoveredQuestions / totalQuestionBank) * 1000) / 10
      : 0;
  const recentTrend = trend.slice(-7);
  const recentAverageAttempts =
    recentTrend.length > 0
      ? Math.round(
          (recentTrend.reduce((sum, point) => sum + point.attempts, 0) /
            recentTrend.length) *
            10,
        ) / 10
      : 0;
  const recentAveragePercent = Math.max(
    0,
    Math.min(
      100,
      Math.round((recentAverageAttempts / DAILY_GOAL_TARGET) * 100),
    ),
  );
  const accuracyOuterData = buildOuterSlices(
    activeSubjectStats
      .filter((subject) => subject.totalAttempts > 0)
      .map((subject) => ({
        id: `accuracy-${subject.subjectId}`,
        label: subject.subjectName,
        value: subject.totalAttempts,
      })),
    'No practice yet',
    5,
    (item, index) =>
      item.label === 'Other'
        ? DONUT_OUTER_COLORS[index % DONUT_OUTER_COLORS.length]
        : getSubjectColor(item.label),
  );

  const coverageOuterData = buildOuterSlices(
    subjectStats
      .filter((subject) => subject.attemptedQuestions > 0)
      .map((subject) => ({
        id: `coverage-${subject.subjectId}`,
        label: subject.subjectName,
        value: subject.attemptedQuestions,
      })),
    'No coverage yet',
    5,
    (item, index) =>
      item.label === 'Other'
        ? DONUT_OUTER_COLORS[index % DONUT_OUTER_COLORS.length]
        : getSubjectColor(item.label),
  );

  const recentTotalAttempts = recentTrend.reduce(
    (sum, point) => sum + point.attempts,
    0,
  );

  const dailyTrendOuterData = recentTrend.length
    ? recentTrend.map((point) => {
        const dayLabel = formatTrendDayLabel(point.date);
        return {
          id: point.date,
          label: dayLabel,
          value: point.attempts,
          color: RECENT_ACTIVITY_DAY_COLORS[dayLabel] ?? RECENT_ACTIVITY_IDLE,
          detail:
            point.attempts > 0
              ? `${point.attempts} ${point.attempts === 1 ? 'attempt' : 'attempts'} - ${Math.round((point.attempts / recentTotalAttempts) * 100)}%`
              : 'No attempts',
        };
      })
    : [
        {
          id: 'empty',
          label: 'No activity',
          value: 1,
          color: RECENT_ACTIVITY_IDLE,
          detail: '0 attempts',
        },
      ];

  const accuracyViews: DonutView[] = [
    {
      id: 'accuracy',
      label: 'Accuracy',
      centerTitle: 'Overall accuracy',
      centerValue: overallAccuracyLabel,
      centerHint: `${correctAttempts}/${totalAttempts || 0} correct`,
      scaleHint: `Each ring is scaled against ${totalAttempts || 0} total attempts.`,
      helperText:
        'Accuracy is based on all recorded attempts. The outer ring shows which subjects are driving that total.',
      legendTitle: 'Attempts by subject',
      innerData: [
        {
          id: 'correct',
          label: 'Correct',
          value: correctAttempts,
          color: DONUT_INNER_ACTIVE,
          detail: overallAccuracyLabel,
        },
        {
          id: 'incorrect',
          label: 'Incorrect',
          value: incorrectAttempts,
          color: DONUT_INNER_MUTED,
          detail: formatPercentLabel(Math.max(0, 100 - overallAccuracyPercent)),
        },
      ],
      outerData: accuracyOuterData,
    },
    {
      id: 'coverage',
      label: 'Coverage',
      centerTitle: 'Question coverage',
      centerValue: formatPercentLabel(overallCoveragePercent),
      centerHint: `${totalCoveredQuestions}/${totalQuestionBank || 0} covered`,
      scaleHint: `Each ring is scaled against ${totalQuestionBank || 0} total questions.`,
      helperText:
        'Coverage compares practiced questions against the full bank. The outer ring shows where your coverage is concentrated.',
      legendTitle: 'Coverage by subject',
      innerData: [
        {
          id: 'covered',
          label: 'Covered',
          value: totalCoveredQuestions,
          color: DONUT_INNER_ACTIVE,
          detail: formatPercentLabel(overallCoveragePercent),
        },
        {
          id: 'remaining',
          label: 'Remaining',
          value: totalRemainingQuestions,
          color: DONUT_INNER_MUTED,
          detail: formatPercentLabel(Math.max(0, 100 - overallCoveragePercent)),
        },
      ],
      outerData: coverageOuterData,
    },
  ];

  const paceViews: DonutView[] = [
    {
      id: 'today',
      label: 'Today',
      centerTitle: 'Daily goal',
      centerValue: `${dailyGoalProgress}`,
      centerHint: `of ${DAILY_GOAL_TARGET} attempts`,
      scaleHint: `Each ring is scaled against the ${DAILY_GOAL_TARGET}-attempt daily target.`,
      helperText:
        'Today shows how close you are to the daily target. The outer ring shows your actual attempts over the last 7 days.',
      legendTitle: 'Last 7 days',
      innerData: [
        {
          id: 'today-complete',
          label: 'Completed',
          value: Math.min(dailyGoalProgress, DAILY_GOAL_TARGET),
          color: DONUT_INNER_ACTIVE,
          detail: `${dailyGoalPercent}% of goal`,
        },
        {
          id: 'today-remaining',
          label: 'Remaining',
          value: Math.max(0, DAILY_GOAL_TARGET - dailyGoalProgress),
          color: DONUT_INNER_MUTED,
          detail: `${Math.max(0, 100 - dailyGoalPercent)}% left`,
        },
      ],
      outerData: dailyTrendOuterData,
    },
    {
      id: 'pace',
      label: 'Recent Pace',
      centerTitle: '7-day average',
      centerValue: `${recentAverageAttempts}`,
      centerHint: `of ${DAILY_GOAL_TARGET} attempts/day`,
      scaleHint: `Each ring is scaled against the ${DAILY_GOAL_TARGET}-attempt daily target.`,
      helperText:
        'Recent pace averages your last 7 days. The outer ring keeps the underlying daily attempt distribution visible.',
      legendTitle: 'Recent attempt split',
      innerData: [
        {
          id: 'pace-complete',
          label: 'Average pace',
          value: Math.min(recentAverageAttempts, DAILY_GOAL_TARGET),
          color: DONUT_INNER_ACTIVE,
          detail: `${recentAveragePercent}% of target`,
        },
        {
          id: 'pace-remaining',
          label: 'Gap to target',
          value: Math.max(0, DAILY_GOAL_TARGET - recentAverageAttempts),
          color: DONUT_INNER_MUTED,
          detail: `${Math.max(0, 100 - recentAveragePercent)}% below target`,
        },
      ],
      outerData: dailyTrendOuterData,
    },
  ];

  if (isLoading || !isMinimumLoadingElapsed) {
    return (
      <ProgressLoadingSplash
        message={LOADING_MESSAGES[loadingMessageIndex] ?? LOADING_MESSAGES[0]}
        progress={loadingProgress}
      />
    );
  }

  return (
    <div className="emerald-preview min-h-screen overflow-x-clip bg-[var(--background)]">
      <header className="edu-topbar sticky top-0 z-30 border-b backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/35 bg-white/15 shadow-md shadow-[rgba(15,23,42,0.16)]">
              <span className="text-base font-bold text-white">e</span>
            </div>
            <span className="text-base font-semibold text-white">examprep</span>
          </Link>
          <button
            onClick={async () => {
              await logout();
              window.location.href = '/login?fromLogout=1';
            }}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-amber-50 transition-colors hover:text-white"
          >
            {t('common.logOut', 'Log out')}
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <BreadcrumbTrail
          items={[
            { label: t('common.dashboard', 'Dashboard'), href: '/dashboard' },
            { label: 'Progress' },
          ]}
        />

        <div className="edu-hero mb-6 px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {t('progress.title', 'Progress Dashboard')}
          </h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            {t(
              'progress.subtitle',
              'Track consistency, subject performance, and weak areas.',
            )}
          </p>
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

        <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          <StatCard
            title="Total Questions"
            value={String(overallStats?.totalAttempts ?? 0)}
            hint="All attempts recorded"
          />
          <StatCard
            title="Current Streak"
            value={`${overallStats?.currentStreak ?? 0} ${(overallStats?.currentStreak ?? 0) === 1 ? 'day' : 'days'}`}
            hint="Consecutive active days"
          />
        </div>
        <div className="mt-6 grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
          <LayeredDonutStatCard
            title="Overall Accuracy"
            views={accuracyViews}
          />
          <LayeredDonutStatCard title="Daily Goal" views={paceViews} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3 [&>*]:min-w-0">
          <Card className="lg:col-span-2" padding="lg">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Strengths & Weaknesses
            </h2>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">
              Compare accuracy, coverage, and practice depth across your most-used subjects.
            </p>

            {strengthChartData.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No subject data yet"
                  description="Answer some questions across subjects to generate the radar chart."
                />
              </div>
            ) : (
              <div className="mt-4 h-[29rem] md:h-[31rem]">
                <ProgressChart data={strengthChartData} />
              </div>
            )}
          </Card>

          <Card padding="lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Weak Topics
              </h2>
              <Link
                href="/subjects"
                className="text-sm font-semibold text-[var(--accent-strong)] hover:opacity-80"
              >
                Practice
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {weakTopics.length === 0 && (
                <p className="text-sm text-[var(--foreground)]/70">
                  No weak topics detected yet.
                </p>
              )}
              {weakTopics.slice(0, 6).map((topic) => (
                <Link
                  key={topic.topicId}
                  href={`/subjects/${topic.subjectId}/topics?grade=${topic.gradeId}&focus=${topic.topicId}`}
                  className="block rounded-2xl border border-[var(--border-color)] p-3 transition hover:border-[var(--accent-color)]"
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {topic.topicName}
                  </p>
                  <p className="text-xs text-[var(--foreground)]/65">
                    {topic.subjectName} - Grade {topic.gradeNumber}
                  </p>
                  <p className="mt-1 text-xs font-medium text-rose-500">
                    {topic.adjustedAccuracy}% adjusted risk score (
                    {topic.accuracy}% raw)
                  </p>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {t('progress.perSubjectProgress', 'Per-Subject Progress')}
            </h2>
            <div className="mt-4 space-y-3">
              {activeSubjectStats.length === 0 && (
                <p className="text-sm text-[var(--foreground)]/70">
                  {t('progress.noSubjectAttempts', 'No subject attempts yet.')}
                </p>
              )}
              {activeSubjectStats.map((subject) => (
                <button
                  key={subject.subjectId}
                  type="button"
                  onClick={() => openSubjectModal(subject)}
                  className="w-full rounded-2xl border border-[var(--border-color)] p-3 text-left transition hover:border-[var(--accent-color)]"
                >
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <p className="font-semibold text-[var(--foreground)]">
                      {subject.subjectName}
                    </p>
                    <p className="text-xs text-[var(--foreground)]/65">
                      {subject.attemptedQuestions}/{subject.totalQuestions}{' '}
                      covered
                    </p>
                  </div>
                  <ProgressBar
                    value={subject.coverage}
                    color="teal"
                    size="sm"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-[var(--foreground)]/65">
                      {subject.coverage}% coverage - {subject.accuracy}%{' '}
                      {t('progress.accuracy', 'accuracy')}
                    </p>
                    <p className="text-xs font-semibold text-[var(--accent-strong)]">
                      {t('progress.viewBreakdown', 'View breakdown')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Grade-Level Breakdown
            </h2>
            <div className="mt-4 space-y-3">
              {gradeStats.length === 0 && (
                <p className="text-sm text-[var(--foreground)]/70">
                  No grade-level data yet.
                </p>
              )}
              {gradeStats.map((grade) => (
                <button
                  key={grade.gradeId}
                  type="button"
                  onClick={() => openGradeModal(grade)}
                  className="w-full rounded-2xl border border-[var(--border-color)] p-3 text-left transition hover:border-[var(--accent-color)]"
                >
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <p className="font-semibold text-[var(--foreground)]">
                      Grade {grade.gradeNumber}
                    </p>
                    <p className="text-xs text-[var(--foreground)]/65">
                      {grade.totalAttempts} attempts
                    </p>
                  </div>
                  <ProgressBar
                    value={grade.accuracy}
                    color="orange"
                    size="sm"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-[var(--foreground)]/65">
                      {grade.accuracy}% accuracy
                    </p>
                    <p className="text-xs font-semibold text-[var(--accent-strong)]">
                      View breakdown
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </main>

      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setSelectedSubject(null);
        }}
        title={
          selectedSubject
            ? `${selectedSubject.subjectName} ${t('progress.subjectBreakdownTitle', 'Accuracy Breakdown')}`
            : t('progress.subjectBreakdownTitle', 'Accuracy Breakdown')
        }
        size="lg"
      >
        {!selectedSubject ? null : (
          <div className="space-y-4">
            <Card padding="md">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
                    {t('progress.correctVsIncorrect', 'Correct vs Incorrect')}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {subjectCorrectPercent}% {t('progress.correct', 'correct')}{' '}
                    - {subjectIncorrectPercent}%{' '}
                    {t('progress.incorrect', 'incorrect')}
                  </p>
                </div>
                <div className="text-sm text-[var(--foreground)]/80">
                  <p>
                    {selectedSubject.correctAttempts} correct out of{' '}
                    {selectedSubject.totalAttempts} attempts.
                  </p>
                  <p className="mt-1">
                    {selectedSubjectIncorrectAttempts} incorrect attempts need
                    review.
                  </p>
                </div>
              </div>
            </Card>

            {isLoadingSubjectTopics && (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}

            {!isLoadingSubjectTopics && subjectModalError && (
              <p className="text-sm text-rose-500">{subjectModalError}</p>
            )}

            {!isLoadingSubjectTopics &&
              !subjectModalError &&
              selectedSubjectTopics.length === 0 && (
                <p className="text-sm text-[var(--foreground)]/70">
                  {t(
                    'progress.noTopicAttempts',
                    'No topic-level attempts yet for this subject.',
                  )}
                </p>
              )}

            {!isLoadingSubjectTopics &&
              !subjectModalError &&
              selectedSubjectTopics.length > 0 && (
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {selectedSubjectTopics.map((topic) => {
                    const incorrect = Math.max(
                      0,
                      topic.totalAttempts - topic.correctAttempts,
                    );
                    return (
                      <div
                        key={topic.topicId}
                        className="rounded-2xl border border-[var(--border-color)] p-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              {topic.topicName}
                            </p>
                            <p className="text-xs text-[var(--foreground)]/65">
                              {t('progress.grade', 'Grade')} {topic.gradeNumber}
                            </p>
                          </div>
                          <p className="text-xs text-[var(--foreground)]/65">
                            {topic.totalAttempts}{' '}
                            {t('progress.attempts', 'attempts')}
                          </p>
                        </div>
                        <div className="mt-2">
                          <ProgressBar
                            value={topic.accuracy}
                            color="teal"
                            size="sm"
                          />
                          <p className="mt-1 text-xs text-[var(--foreground)]/65">
                            {topic.accuracy}%{' '}
                            {t('progress.accuracy', 'accuracy')} -{' '}
                            {topic.correctAttempts}{' '}
                            {t('progress.correct', 'correct')} - {incorrect}{' '}
                            {t('progress.incorrect', 'incorrect')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSubjectModalOpen(false);
                  setSelectedSubject(null);
                }}
              >
                {t('common.close', 'Close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isGradeModalOpen}
        onClose={() => {
          setIsGradeModalOpen(false);
          setSelectedGrade(null);
        }}
        title={
          selectedGrade
            ? `Grade ${selectedGrade.gradeNumber} Breakdown`
            : 'Grade Breakdown'
        }
        size="lg"
      >
        {!selectedGrade ? null : (
          <div className="space-y-4">
            <Card padding="md">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
                    Overall Accuracy
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {selectedGradeOverallAccuracy}%
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
                    Total Attempts
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {selectedGradeTotals.totalAttempts}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
                    Subjects Practiced
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {activeGradeSubjects.length}
                  </p>
                </div>
              </div>
            </Card>

            {isLoadingGradeSubjects && (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}

            {!isLoadingGradeSubjects && gradeModalError && (
              <p className="text-sm text-rose-500">{gradeModalError}</p>
            )}

            {!isLoadingGradeSubjects &&
              !gradeModalError &&
              activeGradeSubjects.length === 0 && (
                <p className="text-sm text-[var(--foreground)]/70">
                  No subject attempts yet for this grade.
                </p>
              )}

            {!isLoadingGradeSubjects &&
              !gradeModalError &&
              activeGradeSubjects.length > 0 && (
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {activeGradeSubjects.map((subject: GradeDetailStat) => (
                    <div
                      key={subject.subjectId}
                      className="rounded-2xl border border-[var(--border-color)] p-3"
                    >
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <p className="font-semibold text-[var(--foreground)]">
                          {subject.subjectName}
                        </p>
                        <p className="text-xs text-[var(--foreground)]/65">
                          {subject.totalAttempts} attempts
                        </p>
                      </div>
                      <ProgressBar
                        value={subject.accuracy}
                        color="orange"
                        size="sm"
                      />
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-xs text-[var(--foreground)]/65">
                          {subject.attemptedQuestions}/{subject.totalQuestions}{' '}
                          covered - {subject.accuracy}% accuracy
                        </p>
                        <p className="text-xs font-semibold text-[var(--accent-strong)]">
                          {subject.coverage}% coverage
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsGradeModalOpen(false);
                  setSelectedGrade(null);
                }}
              >
                {t('common.close', 'Close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function buildGaugeRings(view: DonutView): GaugeRing[] {
  return [...view.innerData, ...view.outerData].map((slice, index) => ({
    ...slice,
    category: index < view.innerData.length ? 'Core metric' : view.legendTitle,
    fill: slice.color,
  }));
}

function buildGaugeDomain(view: DonutView): number {
  const innerTotal = view.innerData.reduce((sum, slice) => sum + slice.value, 0);
  const largestRing = Math.max(
    0,
    ...view.innerData.map((slice) => slice.value),
    ...view.outerData.map((slice) => slice.value),
  );

  return Math.max(1, innerTotal, largestRing);
}

function RadialGaugeTooltip({ active, payload }: RadialGaugeTooltipProps) {
  const ring = payload?.[0]?.payload;

  if (!active || !ring) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-color)_96%,white)] px-4 py-3 shadow-[0_14px_28px_color-mix(in_srgb,var(--accent-color)_12%,transparent)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--foreground)]/48">
        {ring.category}
      </p>
      <div className="mt-2 flex items-start gap-2.5">
        <span
          className="mt-1 h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: ring.color }}
        />
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {ring.label}
          </p>
          <p className="text-sm text-[var(--foreground)]/68">{ring.value}</p>
          {ring.detail && (
            <p className="mt-1 text-xs text-[var(--foreground)]/56">
              {ring.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LayeredDonutStatCard({
  title,
  views,
}: {
  title: string;
  views: DonutView[];
}) {
  const [activeViewId, setActiveViewId] = useState(views[0]?.id ?? '');
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const activeView =
    views.find((view) => view.id === activeViewId) ?? views[0] ?? null;

  if (!activeView) return null;

  const gaugeRings = buildGaugeRings(activeView);
  const gaugeDomain = buildGaugeDomain(activeView);
  const normalizedOuterData = activeView.outerData.map((slice) => {
    const displayValue = slice.id === 'empty' ? 0 : slice.value;
    const detail = slice.detail ?? '';
    const isInactive =
      slice.id === 'empty' ||
      displayValue === 0 ||
      detail.toLowerCase().includes('no attempt');

    return {
      ...slice,
      detail,
      displayValue,
      isInactive,
    };
  });
  const outerLegendTotal = normalizedOuterData.reduce(
    (sum, slice) => sum + slice.displayValue,
    0,
  );
  const activeOuterItems = normalizedOuterData.filter((slice) => !slice.isInactive);
  const previewLegendItems =
    (activeOuterItems.length > 0 ? activeOuterItems : normalizedOuterData).slice(
      0,
      3,
    );
  const inactiveOuterCount = normalizedOuterData.filter(
    (slice) => slice.isInactive,
  ).length;
  const activeOuterCount = normalizedOuterData.length - inactiveOuterCount;

  const pillItems = views.map((view) => ({
    key: view.id,
    label: view.label,
    active: activeView.id === view.id,
    onClick: () => {
      setActiveViewId(view.id);
      setIsBreakdownModalOpen(false);
    },
  }));

  return (
    <>
      <Card padding="lg" className="min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
          {title}
        </p>
        <PillNav items={pillItems} size="sm" />
      </div>

      <div className="mt-4 grid gap-6 2xl:grid-cols-[minmax(20rem,0.95fr)_minmax(0,1.05fr)] 2xl:items-start">
        <div className="mx-auto w-full max-w-[27rem] 2xl:mx-0">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--foreground)]/50">
            {activeView.centerTitle}
          </p>
          <div className="rounded-[1.75rem] border border-[var(--border-color)]/86 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-color)_97%,white),color-mix(in_srgb,var(--surface-muted)_46%,var(--surface-color)))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
            <div className="relative h-[18rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={gaugeRings}
                  innerRadius={58}
                  outerRadius={126}
                  startAngle={90}
                  endAngle={450}
                >
                  <PolarAngleAxis
                    tick={false}
                    type="number"
                    domain={[0, gaugeDomain]}
                    reversed
                  />
                  <RechartsTooltip
                    content={<RadialGaugeTooltip />}
                    wrapperStyle={{ zIndex: 40, pointerEvents: 'none' }}
                    allowEscapeViewBox={{ x: true, y: true }}
                  />
                  <RadialBar
                    isAnimationActive={false}
                    dataKey="value"
                    cornerRadius={99}
                    background={{
                      fill: 'rgba(196, 154, 108, 0.12)',
                    }}
                    clockWise
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border border-[var(--border-color)]/70 bg-[color-mix(in_srgb,var(--surface-color)_93%,white)] px-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <p className="text-[clamp(1.55rem,2.3vw,2.1rem)] font-bold leading-none tracking-tight text-[var(--foreground)]">
                    {activeView.centerValue}
                  </p>
                  <p className="mt-1.5 max-w-[7.25rem] text-sm leading-5 text-[var(--foreground)]/66">
                    {activeView.centerHint}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-2 px-2 text-center text-xs leading-5 text-[var(--foreground)]/58">
              {activeView.scaleHint}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--foreground)]/48">
            {activeView.legendTitle}
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {activeView.innerData.map((slice) => (
              <div
                key={slice.id}
                className="rounded-2xl border border-[var(--border-color)]/90 bg-[var(--surface-muted)]/42 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {slice.label}
                  </p>
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="text-[1.55rem] font-bold leading-none text-[var(--foreground)]">
                    {slice.value}
                  </p>
                  {slice.detail && (
                    <p className="text-xs font-medium text-[var(--foreground)]/58">
                      {slice.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="max-w-[52ch] text-sm leading-6 text-[var(--foreground)]/72">
            {activeView.helperText}
          </p>
          <div className="rounded-2xl border border-[var(--border-color)]/86 bg-[var(--surface-muted)]/36 p-3">
            <div className="mb-2.5 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]/52">
              <p>Distribution</p>
              <p>{outerLegendTotal} total</p>
            </div>
            <div className="pl-2">
              <div className="space-y-3">
                {previewLegendItems.map((slice) => (
                  <div
                    key={slice.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)]/85 bg-[var(--surface-color)]/72 px-3 py-2"
                  >
                    <div className="min-w-0 flex flex-1 items-center gap-2 pr-3">
                      <span
                        className="h-[10px] w-[10px] shrink-0 rounded-full"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="truncate text-sm font-semibold text-[var(--foreground)]/88">
                        {slice.label}
                      </span>
                    </div>
                    <span className="shrink-0 min-w-[2.75rem] text-right text-sm font-semibold text-[var(--foreground)]/72">
                      {slice.displayValue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <p className="text-xs text-[var(--foreground)]/62">
                {inactiveOuterCount > 0
                  ? `${activeOuterCount} active, ${inactiveOuterCount} with no activity`
                  : `${activeOuterCount} active entries`}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBreakdownModalOpen(true)}
              >
                View breakdown
              </Button>
            </div>
          </div>
        </div>
      </div>
      </Card>

      <Modal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        title={`${title} - ${activeView.legendTitle}`}
        size="lg"
      >
        <div className="space-y-4">
          <Card padding="md">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
                  Total
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  {outerLegendTotal}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
                  Active
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  {activeOuterCount}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
                  No activity
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  {inactiveOuterCount}
                </p>
              </div>
            </div>
          </Card>

          <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
            {normalizedOuterData.map((slice) => (
              <div
                key={slice.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {slice.label}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--foreground)]/62">
                    {slice.detail || 'No additional details'}
                  </p>
                </div>
                <p className="shrink-0 text-base font-semibold text-[var(--foreground)]">
                  {slice.displayValue}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsBreakdownModalOpen(false)}
            >
              {views.length > 1 ? 'Close breakdown' : 'Close'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function buildOuterSlices(
  items: Array<{ id: string; label: string; value: number }>,
  emptyLabel: string,
  maxSlices = 5,
  getColor = (
    _item: { id: string; label: string; value: number },
    index: number,
  ) => DONUT_OUTER_COLORS[index % DONUT_OUTER_COLORS.length],
): DonutSlice[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const sorted = [...items].sort((left, right) => right.value - left.value);

  if (sorted.length === 0) {
    return [
      {
        id: 'empty',
        label: emptyLabel,
        value: 1,
        color: 'rgba(126, 96, 70, 0.16)',
        detail: '0%',
      },
    ];
  }

  const visible = sorted.slice(0, maxSlices);
  const remainingValue = sorted
    .slice(maxSlices)
    .reduce((sum, item) => sum + item.value, 0);

  const merged =
    remainingValue > 0
      ? [...visible, { id: 'other', label: 'Other', value: remainingValue }]
      : visible;

  return merged.map((item, index) => ({
    ...item,
    color: getColor(item, index),
    detail: total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%',
  }));
}

function formatTrendDayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatStrengthAxisLabel(subjectName: string): string {
  const compactMap: Record<string, string> = {
    mathematics: 'Math',
    economics: 'Econ',
    geography: 'Geog',
    english: 'English',
  };
  const normalized = subjectName.trim().toLowerCase();

  if (compactMap[normalized]) {
    return compactMap[normalized];
  }

  if (subjectName.length <= 10) {
    return subjectName;
  }

  const words = subjectName.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 4);
  }

  return `${subjectName.slice(0, 9)}.`;
}
function formatPercentLabel(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const formatted = Number.isInteger(rounded)
    ? rounded.toString()
    : rounded.toFixed(1);
  return `${formatted}%`;
}
function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
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

