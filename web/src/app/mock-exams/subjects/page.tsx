'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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

interface SubjectCardItem {
  subjectId: number;
  subjectName: string;
  examCount: number;
}

export default function MockExamSubjectsPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mockExams, setMockExams] = useState<MockExam[]>([]);

  const subjectCards = useMemo<SubjectCardItem[]>(() => {
    const subjectMap = new Map<number, SubjectCardItem>();
    for (const exam of mockExams) {
      const existing = subjectMap.get(exam.subject.id);
      if (existing) {
        existing.examCount += 1;
      } else {
        subjectMap.set(exam.subject.id, {
          subjectId: exam.subject.id,
          subjectName: exam.subject.name,
          examCount: 1,
        });
      }
    }
    return Array.from(subjectMap.values()).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName),
    );
  }, [mockExams]);

  async function loadData() {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiClient.get<MockExam[]>('/mock-exams');
      setMockExams(response.data);
    } catch {
      setError('Unable to load mock exam subjects right now.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

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
            { label: 'Mock Exam Subjects' },
          ]}
        />

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Choose a Mock Exam Subject
          </h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            Start by selecting the subject you want to test.
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
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </>
          )}

          {!isLoading && subjectCards.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                title="No mock exams available"
                description="An admin needs to publish mock exams before timed practice can begin."
              />
            </div>
          )}

          {subjectCards.map((subject) => (
            <Link
              key={subject.subjectId}
              href={`/mock-exams/subjects/${subject.subjectId}/grades`}
              className="block"
            >
              <Card padding="lg" hoverable className="h-full">
                <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
                  Subject
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                  {subject.subjectName}
                </h2>
                <p className="mt-3 text-sm text-[var(--foreground)]/70">
                  {subject.examCount} available mock exam
                  {subject.examCount === 1 ? '' : 's'}
                </p>
              </Card>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
