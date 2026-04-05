'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { BreadcrumbTrail, Card, EmptyState, Skeleton } from '@/components/ui';

interface MockExam {
  id: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  subject: { id: number; name: string };
  grade: { id: number; gradeNumber: number };
}

interface GradeCardItem {
  gradeId: number;
  gradeNumber: number;
  examCount: number;
}

export default function MockExamGradesPage() {
  const params = useParams<{ id: string }>();
  const subjectId = Number(params?.id ?? '');
  const router = useRouter();
  const { logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mockExams, setMockExams] = useState<MockExam[]>([]);

  const subjectName = mockExams[0]?.subject.name ?? 'Selected Subject';

  const gradeCards = useMemo<GradeCardItem[]>(() => {
    const gradeMap = new Map<number, GradeCardItem>();
    for (const exam of mockExams) {
      const existing = gradeMap.get(exam.grade.id);
      if (existing) {
        existing.examCount += 1;
      } else {
        gradeMap.set(exam.grade.id, {
          gradeId: exam.grade.id,
          gradeNumber: exam.grade.gradeNumber,
          examCount: 1,
        });
      }
    }
    return Array.from(gradeMap.values()).sort((a, b) => a.gradeNumber - b.gradeNumber);
  }, [mockExams]);

  const loadData = useCallback(async () => {
    if (Number.isNaN(subjectId)) {
      setError('Invalid subject selected.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await apiClient.get<MockExam[]>('/mock-exams', {
        params: { subjectId },
      });
      setMockExams(response.data);
    } catch {
      setError('Unable to load mock exam grades right now.');
    } finally {
      setIsLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-[var(--background)] page-gradient">
      <header className="sticky top-0 z-30 border-b border-[var(--border-color)] bg-[var(--background)]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl">
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
            { label: 'Mock Exam Subjects', href: '/mock-exams/subjects' },
            { label: 'Grades' },
          ]}
        />

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Choose Grade for {subjectName}
          </h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            Select a grade and we will take you directly to the mock exam.
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-red-200/70 bg-red-50/60">
            <p className="text-sm text-red-700">{error}</p>
          </Card>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          )}

          {!isLoading && gradeCards.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                title="No mock exams for this subject"
                description="Try another subject with available exams."
                action={
                  <Link
                    href="/mock-exams/subjects"
                    className="ui-pill rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
                  >
                    Back to subjects
                  </Link>
                }
              />
            </div>
          )}

          {gradeCards.map((grade) => (
            <Link
              key={grade.gradeId}
              href={`/mock-exams?subjectId=${subjectId}&gradeId=${grade.gradeId}&autoStart=1`}
              className="block"
            >
              <Card padding="lg" hoverable className="h-full">
                <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
                  Grade
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                  Grade {grade.gradeNumber}
                </h2>
                <p className="mt-3 text-sm text-[var(--foreground)]/70">
                  {grade.examCount} available exam{grade.examCount === 1 ? '' : 's'}
                </p>
              </Card>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
