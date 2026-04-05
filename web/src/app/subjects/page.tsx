'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueries, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { useSubjects, useSubjectStats, queryKeys } from '@/hooks';
import {
  BreadcrumbTrail,
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

interface SubjectDetail {
  topics: Array<{
    id: number;
    gradeId: number;
  }>;
}

export default function SubjectsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout } = useAuthStore();

  const {
    data: subjects = [],
    isLoading: subjectsLoading,
    error: subjectsError,
    refetch,
  } = useSubjects();
  const { data: subjectStats = [] } = useSubjectStats();
  const { data: grades = [], isLoading: gradesLoading } = useQuery({
    queryKey: queryKeys.grades.all,
    queryFn: async () => {
      const { data } = await apiClient.get<Grade[]>('/grades');
      return data;
    },
  });

  const isLoading = subjectsLoading || gradesLoading;
  const error = subjectsError ? 'Unable to load subjects. Please retry.' : '';
  const selectedGradeId = useMemo(() => {
    const gradeId = Number(searchParams.get('grade') || 0);
    return gradeId > 0 ? gradeId : null;
  }, [searchParams]);

  const updateSelectedGrade = useCallback(
    (nextGradeId: number | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextGradeId) {
        params.set('grade', String(nextGradeId));
      } else {
        params.delete('grade');
      }

      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const gradePills = useMemo(
    () =>
      grades
        .filter((grade) => grade.gradeNumber >= 9 && grade.gradeNumber <= 12)
        .sort((a, b) => a.gradeNumber - b.gradeNumber),
    [grades],
  );

  const gradePillItems = useMemo(
    () =>
      gradePills.map((grade) => ({
        key: `grade-${grade.id}`,
        label: `Grade ${grade.gradeNumber}`,
        active: selectedGradeId === grade.id,
        onClick: () =>
          updateSelectedGrade(selectedGradeId === grade.id ? null : grade.id),
      })),
    [gradePills, selectedGradeId, updateSelectedGrade],
  );

  const statsBySubjectId = useMemo(
    () => new Map(subjectStats.map((subject) => [subject.subjectId, subject])),
    [subjectStats],
  );

  const subjectDetailQueries = useQueries({
    queries: subjects.map((subject) => ({
      queryKey: queryKeys.subjects.detail(subject.id),
      queryFn: async () => {
        const { data } = await apiClient.get<SubjectDetail>(
          `/subjects/${subject.id}`,
        );
        return data;
      },
      enabled: subjects.length > 0,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const subjectDetailById = useMemo(
    () =>
      new Map(
        subjects.map((subject, index) => [
          subject.id,
          subjectDetailQueries[index]?.data,
        ]),
      ),
    [subjectDetailQueries, subjects],
  );

  const filteredSubjects = useMemo(() => {
    if (!selectedGradeId) return subjects;

    return subjects.filter((subject) => {
      const detail = subjectDetailById.get(subject.id);
      return detail?.topics.some((topic) => topic.gradeId === selectedGradeId);
    });
  }, [selectedGradeId, subjectDetailById, subjects]);

  const isGradeFiltering =
    !!selectedGradeId &&
    subjectDetailQueries.some(
      (query) => query.isLoading || query.isFetching || !query.data,
    );

  return (
    <div className="min-h-screen bg-[var(--background)] page-gradient">
      <header className="sticky top-0 z-30 border-b border-[var(--border-color)] bg-[var(--background)]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-color)] shadow-md shadow-[color-mix(in_srgb,var(--accent-color)_20%,transparent)]">
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
            className="rounded-full px-5 py-2.5 text-sm font-medium text-[var(--foreground)]/70 transition-colors hover:text-[var(--foreground)]"
          >
            Log out
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <BreadcrumbTrail
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Subjects' },
          ]}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              Choose a Subject
            </h1>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">
              Select a grade first, then pick a subject to choose your chapter.
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

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(isLoading || isGradeFiltering) && (
            <>
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
            </>
          )}

          {!isLoading && !isGradeFiltering && subjects.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                title="No subjects available"
                description="Try again in a moment once subjects are loaded."
              />
            </div>
          )}

          {!isLoading && !isGradeFiltering && filteredSubjects.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                title="No subjects for this grade"
                description="Try another grade or clear the filter to see all subjects."
              />
            </div>
          )}

          {!isLoading &&
            !isGradeFiltering &&
            filteredSubjects.map((subject) => {
              const progress = statsBySubjectId.get(subject.id);
              const attempts = progress?.totalAttempts ?? 0;
              const accuracy = progress?.accuracy ?? 0;
              const totalQuestions = progress?.totalQuestions ?? 0;
              const attemptedQuestions = progress?.attemptedQuestions ?? 0;
              const coverage = progress?.coverage ?? 0;
              const href = selectedGradeId
                ? `/subjects/${subject.id}/topics?grade=${selectedGradeId}`
                : `/subjects/${subject.id}/topics`;

              return (
                <Link key={subject.id} href={href} className="block">
                  <Card padding="lg" hoverable className="h-full">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
                          Subject
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                          {subject.name}
                        </h2>
                      </div>
                      <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]/80">
                        {subject.icon || 'Study'}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-1.5 flex justify-between text-xs text-[var(--foreground)]/65">
                        <span>
                          {totalQuestions > 0
                            ? `${attemptedQuestions}/${totalQuestions} questions covered`
                            : 'No published questions yet'}
                        </span>
                        <span>{`${coverage}%`}</span>
                      </div>
                      <ProgressBar value={coverage} color="teal" size="sm" />
                      <p className="mt-2 text-xs text-[var(--foreground)]/65">
                        {attempts > 0
                          ? `${accuracy}% accuracy across ${attempts} attempt${attempts === 1 ? '' : 's'}`
                          : 'No attempts yet'}
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })}
        </section>
      </main>
    </div>
  );
}
