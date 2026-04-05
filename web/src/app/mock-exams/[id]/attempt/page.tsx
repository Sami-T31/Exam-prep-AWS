'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { trackFeatureEvent } from '@/lib/analyticsTracker';
import {
  clearSession,
  loadSession,
  MockExamQuestion,
  MockExamSessionState,
  saveFlaggedQuestionIds,
  saveSession,
} from '@/lib/mockExamSession';
import { useAuthStore } from '@/stores/authStore';
import {
  Badge,
  BreadcrumbTrail,
  Button,
  Card,
  EmptyState,
  Modal,
  ProgressBar,
  Skeleton,
} from '@/components/ui';

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

interface SubmitResponse {
  attemptId: string;
  score: number;
  total: number;
  percentage: number;
  timeSpentSeconds: number;
}

export default function MockExamAttemptPage() {
  return (
    <Suspense fallback={<AttemptShell />}>
      <MockExamAttemptContent />
    </Suspense>
  );
}

function MockExamAttemptContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { logout } = useAuthStore();

  const mockExamId = params.id;
  const attemptIdParam = searchParams.get('attemptId') || '';

  const [sessionState, setSessionState] = useState<MockExamSessionState | null>(
    null,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const questions = sessionState?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const answersByQuestionId = sessionState?.answersByQuestionId ?? {};
  const flaggedQuestionIds = sessionState?.flaggedQuestionIds ?? [];
  const answeredCount = Object.keys(answersByQuestionId).length;
  const unansweredCount = questions.length - answeredCount;

  const endsAtMs = useMemo(() => {
    if (!sessionState) return 0;
    return (
      new Date(sessionState.startedAt).getTime() +
      sessionState.durationMinutes * 60 * 1000
    );
  }, [sessionState]);

  const persistSession = useCallback((nextState: MockExamSessionState) => {
    setSessionState(nextState);
    saveSession(nextState);
    saveFlaggedQuestionIds(nextState.attemptId, nextState.flaggedQuestionIds);
  }, []);

  const submitExam = useCallback(async () => {
    if (!sessionState || isSubmitting || sessionState.submitted) return;
    setIsSubmitting(true);
    try {
      const totalAllowedSeconds = sessionState.durationMinutes * 60;
      const timeSpentSeconds = Math.min(
        totalAllowedSeconds,
        Math.max(0, totalAllowedSeconds - Math.max(0, remainingSeconds)),
      );

      const answers = Object.entries(sessionState.answersByQuestionId).map(
        ([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        }),
      );

      const response = await apiClient.post<SubmitResponse>(
        `/mock-exams/attempts/${sessionState.attemptId}/submit`,
        { answers, timeSpentSeconds },
      );

      const finalizedState: MockExamSessionState = {
        ...sessionState,
        submitted: true,
      };
      persistSession(finalizedState);
      clearSession(sessionState.attemptId);
      void trackFeatureEvent('mock_exam_submitted', {
        mockExamId: sessionState.mockExamId,
        attemptId: response.data.attemptId,
        score: response.data.score,
        total: response.data.total,
      });

      router.push(`/mock-exams/attempts/${response.data.attemptId}`);
    } catch (submitError) {
      const axiosError = submitError as AxiosError<{ message?: string }>;
      toast.error(
        axiosError.response?.data?.message || 'Failed to submit exam.',
      );
    } finally {
      setIsSubmitting(false);
      setIsSubmitModalOpen(false);
    }
  }, [isSubmitting, persistSession, remainingSeconds, router, sessionState]);

  useEffect(() => {
    async function initializeAttempt() {
      setIsLoading(true);
      setError('');

      try {
        if (!attemptIdParam) {
          setError(
            'Attempt ID missing. Start the exam from the mock exam listing page.',
          );
          setIsLoading(false);
          return;
        }

        const existing = loadSession(attemptIdParam);
        if (
          existing &&
          existing.mockExamId === mockExamId &&
          !existing.submitted
        ) {
          setSessionState(existing);
          setRemainingSeconds(
            Math.max(
              0,
              Math.floor(
                (endsAtMs ||
                  new Date(existing.startedAt).getTime() +
                    existing.durationMinutes * 60 * 1000 -
                    Date.now()) / 1000,
              ),
            ),
          );
          setIsLoading(false);
          return;
        }

        const response = await apiClient.post<StartExamResponse>(
          `/mock-exams/${mockExamId}/start`,
        );
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

        persistSession(initialState);
        setRemainingSeconds(
          Math.max(
            0,
            Math.floor(
              (new Date(initialState.startedAt).getTime() +
                initialState.durationMinutes * 60 * 1000 -
                Date.now()) /
                1000,
            ),
          ),
        );

        router.replace(
          `/mock-exams/${mockExamId}/attempt?attemptId=${data.attemptId}`,
        );
      } catch {
        setError('Unable to load this attempt. Please start the exam again.');
      } finally {
        setIsLoading(false);
      }
    }

    initializeAttempt();
  }, [attemptIdParam, mockExamId, persistSession, router, endsAtMs]);

  useEffect(() => {
    if (!sessionState || sessionState.submitted) return;

    const interval = window.setInterval(() => {
      const next = Math.max(0, Math.floor((endsAtMs - Date.now()) / 1000));
      setRemainingSeconds(next);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [endsAtMs, sessionState]);

  useEffect(() => {
    if (!sessionState || sessionState.submitted || isSubmitting) return;
    if (remainingSeconds > 0) return;
    void submitExam();
  }, [isSubmitting, remainingSeconds, sessionState, submitExam]);

  useEffect(() => {
    if (!sessionState || sessionState.submitted) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionState]);

  function selectOption(optionId: string) {
    if (!sessionState || sessionState.submitted) return;
    const nextState: MockExamSessionState = {
      ...sessionState,
      answersByQuestionId: {
        ...sessionState.answersByQuestionId,
        [currentQuestion.questionId]: optionId,
      },
    };
    persistSession(nextState);
  }

  function toggleFlag(questionId: string) {
    if (!sessionState || sessionState.submitted) return;
    const hasFlag = sessionState.flaggedQuestionIds.includes(questionId);
    const nextFlags = hasFlag
      ? sessionState.flaggedQuestionIds.filter((id) => id !== questionId)
      : [...sessionState.flaggedQuestionIds, questionId];
    persistSession({
      ...sessionState,
      flaggedQuestionIds: nextFlags,
    });
  }

  if (isLoading) {
    return (
      <AttemptShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AttemptShell>
    );
  }

  if (error || !sessionState) {
    return (
      <AttemptShell>
        <EmptyState
          title="Unable to open attempt"
          description={error || 'Start a new exam from mock exams list.'}
          action={
            <Link
              href="/mock-exams"
              className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
            >
              Back to mock exams
            </Link>
          }
        />
      </AttemptShell>
    );
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const selectedOptionId = answersByQuestionId[currentQuestion.questionId];

  return (
    <AttemptShell
      title={sessionState.examTitle}
      onLogout={async () => {
        await logout();
        router.push('/login');
      }}
    >
      <BreadcrumbTrail
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mock Exams', href: '/mock-exams' },
          { label: 'Attempt' },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            {sessionState.examTitle}
          </h1>
          <p className="text-sm text-[var(--foreground)]/65">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-color)]/80 bg-[var(--surface-color)] px-4 py-2">
          <p
            className={`text-lg font-bold ${remainingSeconds <= 60 ? 'text-red-600' : 'text-[var(--foreground)]'}`}
          >
            {String(minutes).padStart(2, '0')}:
            {String(seconds).padStart(2, '0')}
          </p>
          <p className="text-xs text-[var(--foreground)]/65">
            Time left
          </p>
        </div>
      </div>

      <ProgressBar
        value={Object.keys(answersByQuestionId).length}
        max={Math.max(questions.length, 1)}
        color="teal"
        size="sm"
        className="mb-6"
      />

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card padding="md">
          <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">
            Question Navigator
          </p>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
              const isActive = index === currentIndex;
              const isAnswered = !!answersByQuestionId[question.questionId];
              const isFlagged = flaggedQuestionIds.includes(
                question.questionId,
              );

              return (
                <button
                  key={question.questionId}
                  onClick={() => setCurrentIndex(index)}
                  className={`relative rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                    isActive
                      ? 'border-[var(--accent-color)] bg-[color-mix(in_srgb,var(--accent-color)_18%,var(--surface-color))] text-[var(--accent-strong)]'
                      : isAnswered
                        ? 'border-[var(--accent-color)] bg-[color-mix(in_srgb,var(--accent-color)_12%,var(--surface-color))] text-[var(--accent-strong)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--foreground)]/75'
                  }`}
                >
                  {index + 1}
                  {isFlagged && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 text-xs text-[var(--foreground)]/65">
            <p>Answered: {answeredCount}</p>
            <p>Unanswered: {unansweredCount}</p>
            <p>Flagged: {flaggedQuestionIds.length}</p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card padding="lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Badge
                variant={
                  currentQuestion.difficulty === 'EASY'
                    ? 'easy'
                    : currentQuestion.difficulty === 'MEDIUM'
                      ? 'medium'
                      : 'hard'
                }
              >
                {currentQuestion.difficulty.toLowerCase()}
              </Badge>
              <button
                onClick={() => toggleFlag(currentQuestion.questionId)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  flaggedQuestionIds.includes(currentQuestion.questionId)
                    ? 'bg-[color-mix(in_srgb,var(--accent-color)_18%,var(--surface-color))] text-[var(--accent-strong)]'
                    : 'bg-[var(--surface-muted)] text-[var(--foreground)]/75'
                }`}
              >
                {flaggedQuestionIds.includes(currentQuestion.questionId)
                  ? 'Flagged'
                  : 'Flag for review'}
              </button>
            </div>

            <p className="text-lg font-semibold leading-relaxed text-[var(--foreground)]">
              {currentQuestion.questionText}
            </p>

            <div className="mt-4 grid gap-3">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                return (
                  <button
                  key={option.id}
                  onClick={() => selectOption(option.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-[var(--accent-color)] bg-[color-mix(in_srgb,var(--accent-color)_14%,var(--surface-color))] text-[var(--foreground)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--foreground)]/85 hover:border-[var(--accent-color)]'
                  }`}
                >
                  <span className="mr-2 text-xs font-semibold text-[var(--foreground)]/65">
                    {option.optionLabel}
                  </span>
                  {option.optionText}
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentIndex((prev) =>
                    Math.min(questions.length - 1, prev + 1),
                  )
                }
                disabled={currentIndex === questions.length - 1}
              >
                Next
              </Button>
            </div>
            <Button
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Submit Exam
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => (isSubmitting ? undefined : setIsSubmitModalOpen(false))}
        title="Submit Exam"
      >
        <p className="text-sm text-[var(--foreground)]/75">
          Are you sure you want to submit? You still have {unansweredCount}{' '}
          unanswered question(s).
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setIsSubmitModalOpen(false)}
            disabled={isSubmitting}
          >
            Continue Exam
          </Button>
          <Button onClick={() => void submitExam()} isLoading={isSubmitting}>
            Submit Now
          </Button>
        </div>
      </Modal>
    </AttemptShell>
  );
}

function AttemptShell({
  title = 'Mock Exam Attempt',
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
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl">
              <span className="text-base font-bold text-white">e</span>
            </div>
            <span className="text-base font-semibold text-[var(--foreground)]">
              examprep
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-[var(--foreground)]/65 sm:block">
              {title}
            </p>
            {onLogout && (
              <button
                onClick={() => {
                  onLogout();
                }}
                className="rounded-full px-4 py-2 text-sm font-medium text-[var(--foreground)]/65 transition-colors hover:text-[var(--foreground)]"
              >
                Log out
              </button>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
