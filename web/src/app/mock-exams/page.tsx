'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { clearSession, MockExamQuestion, MockExamSessionState, saveFlaggedQuestionIds, saveSession } from '@/lib/mockExamSession';
import { useAuthStore } from '@/stores/authStore';
import { useMockExams, useMockExamAttempts } from '@/hooks';
import {
  Badge,
  BreadcrumbTrail,
  Button,
  Card,
  EmptyState,
  Modal,
  Skeleton,
} from '@/components/ui';

interface MockExam {
  id: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  subject: { id: number; name: string };
  grade: { id: number; gradeNumber: number };
  _count: { mockExamQuestions: number };
}

interface MockExamAttemptHistory {
  id: string;
  startedAt: string;
  completedAt: string | null;
  score: number;
  total: number;
  percentage: number;
  mockExam: {
    id: string;
    title: string;
    durationMinutes: number;
    subject: { id: number; name: string };
    grade: { id: number; gradeNumber: number };
  };
}

interface StartExamResponse {
  attemptId: string;
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
    subject: { id: number; name: string };
    grade: { id: number; gradeNumber: number };
  };
  startedAt: string;
  questions: MockExamQuestion[];
}

export default function MockExamsPage() {
  return (
    <Suspense>
      <MockExamsContent />
    </Suspense>
  );
}

function MockExamsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuthStore();
  const [isStarting, setIsStarting] = useState(false);
  const [selectedExam, setSelectedExam] = useState<MockExam | null>(null);
  const [autoStartHandled, setAutoStartHandled] = useState(false);

  const rawSubjectId = searchParams.get('subjectId');
  const rawGradeId = searchParams.get('gradeId');
  const subjectIdParam = rawSubjectId ? Number(rawSubjectId) : undefined;
  const gradeIdParam = rawGradeId ? Number(rawGradeId) : undefined;
  const shouldAutoStart = searchParams.get('autoStart') === '1';

  const { data: mockExams = [], isLoading, error: queryError, refetch } = useMockExams(subjectIdParam, gradeIdParam);
  const { data: attemptHistory = [] } = useMockExamAttempts();

  const error = queryError ? 'Unable to load mock exams. Please retry.' : '';

  const groupedBySubject = useMemo(() => {
    const groups = new Map<string, MockExam[]>();
    for (const exam of mockExams) {
      const key = exam.subject.name;
      const existing = groups.get(key) ?? [];
      existing.push(exam);
      groups.set(key, existing);
    }
    return Array.from(groups.entries());
  }, [mockExams]);

  const latestAttemptByExamId = useMemo(() => {
    const map = new Map<string, MockExamAttemptHistory>();
    for (const attempt of attemptHistory) {
      if (!map.has(attempt.mockExam.id)) {
        map.set(attempt.mockExam.id, attempt);
      }
    }
    return map;
  }, [attemptHistory]);

  const startExamById = useCallback(async (exam: MockExam) => {
    setIsStarting(true);
    try {
      const response = await apiClient.post<StartExamResponse>(`/mock-exams/${exam.id}/start`);
      const data = response.data;

      const initialState: MockExamSessionState = {
        attemptId: data.attemptId,
        mockExamId: data.exam.id,
        examTitle: data.exam.title,
        durationMinutes: data.exam.durationMinutes,
        startedAt: data.startedAt,
        questions: data.questions,
        answersByQuestionId: {},
        flaggedQuestionIds: [],
        submitted: false,
      };

      clearSession(data.attemptId);
      saveSession(initialState);
      saveFlaggedQuestionIds(data.attemptId, []);

      router.push(`/mock-exams/${exam.id}/attempt?attemptId=${data.attemptId}`);
    } catch {
      toast.error('Unable to start this mock exam right now.');
    } finally {
      setIsStarting(false);
      setSelectedExam(null);
    }
  }, [router]);

  useEffect(() => {
    setAutoStartHandled(false);
  }, [gradeIdParam, shouldAutoStart, subjectIdParam]);

  useEffect(() => {
    if (isLoading || isStarting || autoStartHandled || !shouldAutoStart) return;
    setAutoStartHandled(true);
    if (mockExams.length === 0) {
      toast.error('No mock exam available for the selected subject and grade.');
      return;
    }
    void startExamById(mockExams[0]!);
  }, [autoStartHandled, isLoading, isStarting, mockExams, shouldAutoStart, startExamById]);

  async function startExam() {
    if (!selectedExam) return;
    await startExamById(selectedExam);
  }

  return (
    <div className="min-h-screen bg-[var(--background)] page-gradient">
      <header className="sticky top-0 z-30 border-b border-[var(--border-color)] bg-[var(--background)]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl">
              <span className="text-base font-bold text-white">e</span>
            </div>
            <span className="text-base font-semibold text-[var(--foreground)]">examprep</span>
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
            { label: 'Mock Exams' },
          ]}
        />

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Mock Exams</h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            Take timed exams and review detailed results after submission.
          </p>
          <div className="mt-4">
            <Link
              href="/mock-exams/subjects"
              className="brand-action ui-pill inline-flex rounded-full px-4 py-2 text-sm font-semibold text-white transition-all"
            >
              Choose subject and grade
            </Link>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-red-200/70 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/20">
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
              Retry
            </Button>
          </Card>
        )}

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {!isLoading && mockExams.length === 0 && (
          <EmptyState
            title="No mock exams available"
            description="An admin needs to publish mock exams before timed practice can begin."
          />
        )}

        {!isLoading && groupedBySubject.map(([subjectName, exams]) => (
          <section key={subjectName} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{subjectName}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {exams.map((exam) => {
                const latestAttempt = latestAttemptByExamId.get(exam.id);
                return (
                  <Card key={exam.id} padding="lg" hoverable>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[var(--foreground)]">{exam.title}</p>
                        <p className="mt-1 text-xs text-[var(--foreground)]/65">
                          Grade {exam.grade.gradeNumber} - {exam.durationMinutes} min - {exam._count.mockExamQuestions} questions
                        </p>
                      </div>
                      <Badge variant="info">Timed</Badge>
                    </div>

                    {latestAttempt && (
                      <div className="mt-4 rounded-2xl border border-[var(--border-color)]/75 p-3">
                        <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">Latest attempt</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                          {latestAttempt.score}/{latestAttempt.total} ({latestAttempt.percentage}%)
                        </p>
                        {latestAttempt.completedAt ? (
                          <p className="mt-0.5 text-xs text-[var(--foreground)]/65">
                            Completed {new Date(latestAttempt.completedAt).toLocaleString()}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-[var(--accent-strong)]">
                            In progress
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setSelectedExam(exam)}>Start Exam</Button>
                      {latestAttempt?.completedAt && (
                        <Link
                          href={`/mock-exams/attempts/${latestAttempt.id}`}
                          className="ui-pill rounded-full border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--foreground)]"
                        >
                          View Results
                        </Link>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      <Modal
        isOpen={!!selectedExam}
        onClose={() => (isStarting ? undefined : setSelectedExam(null))}
        title="Start Mock Exam"
      >
        {selectedExam && (
          <div>
            <p className="text-sm text-[var(--foreground)]/75">
              You are about to start <span className="font-semibold">{selectedExam.title}</span>.
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]/75">
              <li>Time limit: {selectedExam.durationMinutes} minutes</li>
              <li>You can navigate between questions before final submit</li>
              <li>Exam auto-submits when timer reaches zero</li>
              <li>Refreshing is supported and restores your attempt state</li>
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedExam(null)} disabled={isStarting}>
                Cancel
              </Button>
              <Button onClick={startExam} isLoading={isStarting}>
                Start now
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


