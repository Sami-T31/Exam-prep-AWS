'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { apiClient } from '@/lib/apiClient';
import { loadFlaggedQuestionIds } from '@/lib/mockExamSession';
import { useAuthStore } from '@/stores/authStore';
import {
  Badge,
  BreadcrumbTrail,
  Button,
  Card,
  EmptyState,
  Skeleton,
} from '@/components/ui';

type FilterMode = 'all' | 'incorrect' | 'flagged';

interface ReviewOption {
  id: string;
  optionLabel: string;
  optionText: string;
  isCorrect: boolean;
}

interface ReviewQuestion {
  questionId: string;
  questionText: string;
  explanation: string | null;
  selectedOptionId: string;
  isCorrect: boolean;
  options: ReviewOption[];
}

interface ReviewResponse {
  attemptId: string;
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
  };
  score: number;
  total: number;
  percentage: number;
  timeSpentSeconds: number;
  startedAt: string;
  completedAt: string;
  benchmark: {
    completedAttemptCount: number;
    averagePercentage: number | null;
  } | null;
  questions: ReviewQuestion[];
}

function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function MockExamReviewPage() {
  const params = useParams<{ attemptId: string }>();
  const router = useRouter();
  const { logout } = useAuthStore();

  const attemptId = params.attemptId;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadReview() {
      setIsLoading(true);
      setError('');
      try {
        const response = await apiClient.get<ReviewResponse>(`/mock-exams/attempts/${attemptId}/review`);
        setReview(response.data);
        setFlaggedQuestionIds(loadFlaggedQuestionIds(attemptId));
      } catch (loadError) {
        const axiosError = loadError as AxiosError<{ message?: string }>;
        setError(axiosError.response?.data?.message || 'Unable to load exam review.');
      } finally {
        setIsLoading(false);
      }
    }

    loadReview();
  }, [attemptId]);

  const filteredQuestions = useMemo(() => {
    if (!review) return [];
    if (filter === 'all') return review.questions;
    if (filter === 'incorrect') return review.questions.filter((question) => !question.isCorrect);
    return review.questions.filter((question) => flaggedQuestionIds.includes(question.questionId));
  }, [filter, flaggedQuestionIds, review]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] page-gradient">
        <main className="mx-auto max-w-6xl px-6 py-10">
          <div className="space-y-4">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-[var(--background)] page-gradient">
        <main className="mx-auto max-w-6xl px-6 py-10">
          <EmptyState
            title="Review not available"
            description={error || 'No review data found for this attempt.'}
            action={
              <Link
                href="/mock-exams"
                className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
              >
                Back to mock exams
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  const allowedSeconds = review.exam.durationMinutes * 60;
  const selectedCount = filteredQuestions.length;
  const incorrectCount = review.questions.filter((question) => !question.isCorrect).length;
  const flaggedCount = review.questions.filter((question) => flaggedQuestionIds.includes(question.questionId)).length;

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
            { label: 'Mock Exams', href: '/mock-exams' },
            { label: 'Results' },
          ]}
        />

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Mock Exam Results</h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">{review.exam.title}</p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card padding="lg">
            <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">Score</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              {review.score}/{review.total}
            </p>
            <p className="text-sm text-[var(--foreground)]/70">{review.percentage}%</p>
          </Card>
          <Card padding="lg">
            <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">Time Used</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{formatSeconds(review.timeSpentSeconds)}</p>
            <p className="text-sm text-[var(--foreground)]/70">Allowed {formatSeconds(allowedSeconds)}</p>
          </Card>
          <Card padding="lg">
            <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">Incorrect</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{incorrectCount}</p>
            <p className="text-sm text-[var(--foreground)]/70">Questions to revisit</p>
          </Card>
          <Card padding="lg">
            <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">Exam Average</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              {review.benchmark?.averagePercentage != null ? `${review.benchmark.averagePercentage}%` : 'N/A'}
            </p>
            <p className="text-sm text-[var(--foreground)]/70">
              {review.benchmark
                ? `${review.benchmark.completedAttemptCount} completed attempts`
                : 'Available after 3 completed attempts'}
            </p>
          </Card>
        </div>

        <Card className="mb-5" padding="md">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={filter === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('all')}>
              All ({review.questions.length})
            </Button>
            <Button variant={filter === 'incorrect' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('incorrect')}>
              Incorrect ({incorrectCount})
            </Button>
            <Button variant={filter === 'flagged' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('flagged')}>
              Flagged ({flaggedCount})
            </Button>
          </div>
        </Card>

        {selectedCount === 0 ? (
          <EmptyState
            title="No questions match this filter"
            description="Switch filters to view question-by-question review."
          />
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question, index) => {
              const selectedOption = question.options.find((option) => option.id === question.selectedOptionId);
              const correctOption = question.options.find((option) => option.isCorrect);

              return (
                <Card key={question.questionId} padding="lg">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      Q{index + 1}. {question.questionText}
                    </p>
                    <div className="flex gap-2">
                      {flaggedQuestionIds.includes(question.questionId) && <Badge variant="warning">Flagged</Badge>}
                      <Badge variant={question.isCorrect ? 'success' : 'danger'}>
                        {question.isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="text-[var(--foreground)]/75">
                      <span className="font-semibold">Your answer:</span>{' '}
                      {selectedOption ? `${selectedOption.optionLabel}. ${selectedOption.optionText}` : 'Not answered'}
                    </p>
                    <p className="text-[var(--foreground)]/75">
                      <span className="font-semibold">Correct answer:</span>{' '}
                      {correctOption ? `${correctOption.optionLabel}. ${correctOption.optionText}` : 'Unavailable'}
                    </p>
                    <p className="text-[var(--foreground)]/75">
                      <span className="font-semibold">Explanation:</span>{' '}
                      {question.explanation || 'No explanation was provided for this question.'}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
