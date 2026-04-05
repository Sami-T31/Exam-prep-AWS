'use client';

import Link from 'next/link';
import { Suspense, useCallback, useMemo } from 'react';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { useSubjectTopics, useSubjectDetailStats, queryKeys } from '@/hooks';
import {
  BreadcrumbTrail,
  type BreadcrumbTrailItem,
  Button,
  Card,
  EmptyState,
  PillNav,
  ProgressBar,
  Skeleton,
} from '@/components/ui';

interface Grade {
  id: number;
  gradeNumber: number;
}

const TEMPORARY_CHAPTER_COUNT = 15;

export default function SubjectTopicsPage() {
  return (
    <Suspense fallback={<TopicsPageShell />}>
      <SubjectTopicsContent />
    </Suspense>
  );
}

function SubjectTopicsContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const subjectId = Number(params.id);
  const focusTopicId = Number(searchParams.get('focus') || 0);
  const focusChapter = Number(searchParams.get('chapter') || 0);
  const selectedGradeId = Number(searchParams.get('grade') || 0);
  const initialGradeNumber = Number(searchParams.get('gradeNumber') || 0);

  const {
    data: subject,
    isLoading: subjectLoading,
    error: subjectError,
    refetch,
  } = useSubjectTopics(subjectId);
  const { data: grades = [] } = useQuery({
    queryKey: queryKeys.grades.all,
    queryFn: async () => {
      const { data } = await apiClient.get<Grade[]>('/grades');
      return data;
    },
  });
  const { data: topicStats = [] } = useSubjectDetailStats(subjectId);

  const isLoading = subjectLoading;
  const error = subjectError
    ? 'Unable to load chapters for this subject. Please retry.'
    : '';

  const availableGrades = useMemo(() => {
    if (!subject || grades.length === 0) return [];

    const gradeIds = new Set(subject.topics.map((topic) => topic.gradeId));
    return grades
      .filter((grade) => gradeIds.has(grade.id))
      .sort((left, right) => left.gradeNumber - right.gradeNumber);
  }, [grades, subject]);

  const updateSelectedGrade = useCallback(
    (nextGradeId: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('grade', String(nextGradeId));
      params.delete('gradeNumber');

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const activeGradeId = useMemo(() => {
    if (!subject || availableGrades.length === 0) {
      return selectedGradeId || null;
    }

    if (
      selectedGradeId &&
      subject.topics.some((topic) => topic.gradeId === selectedGradeId)
    ) {
      return selectedGradeId;
    }

    if (initialGradeNumber) {
      const grade = availableGrades.find(
        (item) => item.gradeNumber === initialGradeNumber,
      );
      if (grade && subject.topics.some((topic) => topic.gradeId === grade.id)) {
        return grade.id;
      }
    }

    return availableGrades[0]?.id ?? null;
  }, [availableGrades, initialGradeNumber, selectedGradeId, subject]);

  const topicsForGrade = useMemo(() => {
    if (!subject || !activeGradeId) return [];
    return subject.topics
      .filter((topic) => topic.gradeId === activeGradeId)
      .sort((left, right) => left.id - right.id);
  }, [activeGradeId, subject]);

  const topicStatByTopicId = useMemo(
    () => new Map(topicStats.map((topic) => [topic.topicId, topic])),
    [topicStats],
  );

  const chapterCards = useMemo(
    () =>
      Array.from({ length: TEMPORARY_CHAPTER_COUNT }, (_, index) => ({
        chapterNumber: index + 1,
        topic: topicsForGrade[index] ?? null,
      })),
    [topicsForGrade],
  );

  const gradePillItems = useMemo(
    () =>
      availableGrades.map((grade) => ({
        key: `topic-grade-${grade.id}`,
        label: `Grade ${grade.gradeNumber}`,
        active: activeGradeId === grade.id,
        onClick: () => updateSelectedGrade(grade.id),
      })),
    [activeGradeId, availableGrades, updateSelectedGrade],
  );

  const breadcrumbItems: BreadcrumbTrailItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Subjects', href: '/subjects' },
    { label: subject?.name ?? 'Topics' },
  ];

  if (activeGradeId) {
    const activeGradeNumber = availableGrades.find(
      (grade) => grade.id === activeGradeId,
    )?.gradeNumber;

    if (activeGradeNumber) {
      breadcrumbItems.push({ label: `Grade ${activeGradeNumber}` });
    }
  }

  if (focusChapter > 0) {
    breadcrumbItems.push({ label: `Chapter ${focusChapter}` });
  }

  return (
    <TopicsPageShell
      title={subject?.name}
      onLogout={async () => {
        await logout();
        router.push('/login');
      }}
    >
      <BreadcrumbTrail items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {subject?.name ?? 'Subject'} Chapters
          </h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            Temporary structure: Chapter 1-15 per grade until curriculum PDFs
            are mapped.
          </p>
        </div>
      </div>

      <PillNav items={gradePillItems} size="sm" className="mt-6" />

      {error && (
        <Card className="mt-6 border-red-200/70 bg-red-50/60">
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

      <section className="mt-6 grid gap-4">
        {isLoading && (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        )}

        {!isLoading && !activeGradeId && (
          <EmptyState
            title="No grade available"
            description="Select another subject or retry once grades are loaded."
            action={
              <Link
                href="/subjects"
                className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
              >
                Back to subjects
              </Link>
            }
          />
        )}

        {!isLoading &&
          activeGradeId &&
          chapterCards.map((entry) => {
            const { chapterNumber, topic } = entry;
            const topicStat = topic
              ? topicStatByTopicId.get(topic.id)
              : undefined;
            const attempts = topicStat?.totalAttempts ?? 0;
            const accuracy = topicStat?.accuracy ?? 0;
            const totalQuestions = topicStat?.totalQuestions ?? 0;
            const attemptedQuestions = topicStat?.attemptedQuestions ?? 0;
            const coverage = topicStat?.coverage ?? 0;
            const isFocused =
              (topic && focusTopicId === topic.id) ||
              focusChapter === chapterNumber;

            const practiceHref = topic
              ? `/practice?topicId=${topic.id}&difficulty=ALL&subjectId=${subjectId}&gradeId=${topic.gradeId}&chapter=${chapterNumber}`
              : null;

            return (
              <Card
                key={`${activeGradeId}-chapter-${chapterNumber}`}
                padding="lg"
                className={
                  isFocused
                    ? 'border-[var(--accent-color)] shadow-[0_14px_34px_color-mix(in_srgb,var(--accent-color)_28%,transparent)]'
                    : ''
                }
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
                      Grade{' '}
                      {
                        availableGrades.find((grade) => grade.id === activeGradeId)
                          ?.gradeNumber
                      }
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                      Chapter {chapterNumber}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--foreground)]/65">
                      {totalQuestions > 0
                        ? `${attemptedQuestions}/${totalQuestions} questions covered`
                        : 'No chapter content uploaded yet'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--foreground)]/65">
                      {attempts > 0
                        ? `${accuracy}% accuracy across ${attempts} attempt${attempts === 1 ? '' : 's'}`
                        : 'No attempts yet'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {topic ? (
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined' && subject) {
                            window.localStorage.setItem(
                              'lastLearningContext',
                              JSON.stringify({
                                subjectId: subject.id,
                                subjectName: subject.name,
                                gradeId: topic.gradeId,
                                gradeNumber: topic.gradeNumber,
                                topicId: topic.id,
                                topicName: `Chapter ${chapterNumber}`,
                              }),
                            );
                          }
                        }}
                        className="ui-pill rounded-full border border-[var(--border-color)] bg-[var(--surface-color)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                      >
                        Set current
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="rounded-full border border-[var(--border-color)] bg-[var(--surface-color)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]/50"
                      >
                        Set current
                      </button>
                    )}
                    {practiceHref ? (
                      <Link
                        href={practiceHref}
                        className="ui-pill rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] hover:opacity-90"
                      >
                        Practice
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="rounded-full bg-[var(--foreground)]/45 px-4 py-2 text-sm font-semibold text-[var(--background)]/80"
                      >
                        Practice
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-[var(--foreground)]/65">
                    <span>Coverage progress</span>
                    <span>{`${coverage}%`}</span>
                  </div>
                  <ProgressBar
                    value={coverage}
                    color={coverage > 0 ? 'teal' : 'amber'}
                    size="sm"
                  />
                </div>
              </Card>
            );
          })}
      </section>
    </TopicsPageShell>
  );
}

function TopicsPageShell({
  title = 'Topics',
  children,
  onLogout,
}: {
  title?: string;
  children?: React.ReactNode;
  onLogout?: () => Promise<void>;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] page-gradient">
      <header className="sticky top-0 z-30 border-b border-[var(--border-color)] bg-[var(--background)]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-color)] shadow-md shadow-[color-mix(in_srgb,var(--accent-color)_24%,transparent)]">
              <span className="text-base font-bold text-white">e</span>
            </div>
            <span className="text-base font-semibold text-[var(--foreground)]">
              examprep
            </span>
          </Link>
          {onLogout && (
            <button
              onClick={() => {
                void onLogout();
              }}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-[var(--foreground)]/70 transition-colors hover:text-[var(--foreground)]"
            >
              Log out
            </button>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="sr-only">{title}</div>
        {children}
      </main>
    </div>
  );
}
