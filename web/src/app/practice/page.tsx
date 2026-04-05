'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { apiClient } from '@/lib/apiClient';
import { trackFeatureEvent } from '@/lib/analyticsTracker';
import { useAuthStore } from '@/stores/authStore';
import {
  Badge,
  BreadcrumbTrail,
  type BreadcrumbTrailItem,
  Button,
  Card,
  EmptyState,
  PillNav,
  ProgressBar,
  Skeleton,
} from '@/components/ui';

type DifficultyFilter = 'ALL' | 'EASY' | 'MEDIUM' | 'HARD';

interface QuestionOption {
  id: string;
  optionLabel: string;
  optionText: string;
}

interface QuestionItem {
  id: string;
  questionText: string;
  imageUrl: string | null;
  explanation: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  options: QuestionOption[];
}

interface QuestionsResponse {
  data: QuestionItem[];
  total: number;
  limit: number;
  offset: number;
}

interface SubmitAnswerResponse {
  attemptId: string;
  isCorrect: boolean;
  correctOptionId: string;
  correctOptionLabel: string;
  explanation: string | null;
}

interface BookmarkItem {
  id: string;
  question: {
    id: string;
  };
}

interface AnsweredQuestion {
  questionId: string;
  selectedOptionId: string;
  selectedOptionLabel: string;
  correctOptionId: string;
  correctOptionLabel: string;
  isCorrect: boolean;
  explanation: string | null;
  timeSpentSeconds: number;
}

interface SubscriptionStatus {
  isSubscribed: boolean;
  plan: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | null;
  expiresAt: string | null;
  subscriptionId: string | null;
}

export default function PracticePage() {
  return (
    <Suspense fallback={<PracticePageShell />}>
      <PracticePageContent />
    </Suspense>
  );
}

function PracticePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout } = useAuthStore();

  const topicId = Number(searchParams.get('topicId') || 0);
  const subjectId = Number(searchParams.get('subjectId') || 0);
  const gradeId = Number(searchParams.get('gradeId') || 0);
  const chapterNumber = Number(searchParams.get('chapter') || 0);
  const isBookmarkedMode = searchParams.get('bookmarked') === '1';
  const difficultyParam = (
    searchParams.get('difficulty') || 'ALL'
  ).toUpperCase() as DifficultyFilter;
  const difficulty: DifficultyFilter = ['ALL', 'EASY', 'MEDIUM', 'HARD'].includes(
    difficultyParam,
  )
    ? difficultyParam
    : 'ALL';
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [answeredQuestions, setAnsweredQuestions] = useState<
    AnsweredQuestion[]
  >([]);
  const [bookmarksByQuestionId, setBookmarksByQuestionId] = useState<
    Record<string, string>
  >({});
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(
    Date.now(),
  );
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [freeTierRemaining, setFreeTierRemaining] = useState<number | null>(
    null,
  );
  const [isContentLocked, setIsContentLocked] = useState(false);

  const sessionStartedAtRef = useRef<number>(Date.now());

  const updateDifficulty = useCallback(
    (nextDifficulty: DifficultyFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('difficulty', nextDifficulty);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const difficultyPillItems = useMemo(
    () =>
      (['ALL', 'EASY', 'MEDIUM', 'HARD'] as DifficultyFilter[]).map(
        (value) => ({
          key: value,
          label: value === 'ALL' ? 'All' : value.toLowerCase(),
          active: difficulty === value,
          onClick: () => updateDifficulty(value),
        }),
      ),
    [difficulty, updateDifficulty],
  );

  const currentQuestion = questions[currentIndex];
  const answeredCurrentQuestion = currentQuestion
    ? answeredQuestions.find(
        (answer) => answer.questionId === currentQuestion.id,
      )
    : undefined;
  const isCurrentSubmitted = !!answeredCurrentQuestion;

  const score = answeredQuestions.filter((answer) => answer.isCorrect).length;
  const totalTimeSpent = answeredQuestions.reduce(
    (sum, answer) => sum + answer.timeSpentSeconds,
    0,
  );
  const hasCompletedSession =
    questions.length > 0 && currentIndex >= questions.length;

  const incorrectAnswers = useMemo(
    () => answeredQuestions.filter((answer) => !answer.isCorrect),
    [answeredQuestions],
  );

  const bookmarkId = currentQuestion
    ? bookmarksByQuestionId[currentQuestion.id]
    : undefined;
  const isBookmarked = !!bookmarkId;

  const fetchQuestions = useCallback(
    async (nextDifficulty: DifficultyFilter) => {
      if (!isBookmarkedMode && !topicId && (!subjectId || !gradeId)) {
        setError(
          'Topic or grade context is missing. Go back to subjects and choose a chapter.',
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');
      setQuestions([]);
      setCurrentIndex(0);
      setSelectedOptionId('');
      setAnsweredQuestions([]);
      setQuestionStartedAt(Date.now());
      setIsContentLocked(false);
      sessionStartedAtRef.current = Date.now();

      try {
        if (!isBookmarkedMode && subjectId) {
          const [statusResponse, freeTierResponse] = await Promise.all([
            apiClient.get<SubscriptionStatus>('/subscriptions/status'),
            apiClient.get<number>(`/subscriptions/free-tier/${subjectId}`),
          ]);
          setSubscriptionStatus(statusResponse.data);
          setFreeTierRemaining(freeTierResponse.data);

          if (
            !statusResponse.data.isSubscribed &&
            freeTierResponse.data === 0
          ) {
            setQuestions([]);
            setIsContentLocked(true);
            return;
          }
        }

        const bookmarksResponse = await apiClient.get<BookmarkItem[]>(
          '/bookmarks',
          {
            params: {
              ...(subjectId ? { subjectId } : {}),
              ...(gradeId ? { gradeId } : {}),
            },
          },
        );

        const bookmarksMap: Record<string, string> = {};
        for (const bookmark of bookmarksResponse.data) {
          bookmarksMap[bookmark.question.id] = bookmark.id;
        }

        setBookmarksByQuestionId(bookmarksMap);

        if (isBookmarkedMode) {
          const questionResponses = await Promise.all(
            bookmarksResponse.data.map((bookmark) =>
              apiClient.get<QuestionItem>(`/questions/${bookmark.question.id}`),
            ),
          );
          const filtered = questionResponses
            .map((response) => response.data)
            .filter(
              (question) =>
                nextDifficulty === 'ALL' ||
                question.difficulty === nextDifficulty,
            );
          setQuestions(filtered);
        } else {
          const params: Record<string, string | number> = {
            limit: 20,
            offset: 0,
          };

          if (topicId) {
            params.topicId = topicId;
          } else {
            if (subjectId) params.subjectId = subjectId;
            if (gradeId) params.gradeId = gradeId;
          }

          if (nextDifficulty !== 'ALL') {
            params.difficulty = nextDifficulty;
          }

          const questionsResponse = await apiClient.get<QuestionsResponse>(
            '/questions',
            { params },
          );
          setQuestions(questionsResponse.data.data);
        }

        setCurrentIndex(0);
        setQuestionStartedAt(Date.now());
      } catch {
        setError('Unable to load practice questions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [gradeId, isBookmarkedMode, subjectId, topicId],
  );

  useEffect(() => {
    fetchQuestions(difficulty);
  }, [difficulty, fetchQuestions]);

  useEffect(() => {
    if (!isBookmarkedMode && !topicId && (!subjectId || !gradeId)) return;

    void trackFeatureEvent('practice_started', {
      topicId: topicId || null,
      subjectId: subjectId || null,
      gradeId: gradeId || null,
      chapterNumber: chapterNumber || null,
      difficulty,
      mode: isBookmarkedMode ? 'bookmarked' : topicId ? 'topic' : 'chapter',
    });
  }, [
    chapterNumber,
    difficulty,
    gradeId,
    isBookmarkedMode,
    subjectId,
    topicId,
  ]);

  const submitAnswer = useCallback(async () => {
    if (!currentQuestion || !selectedOptionId || isCurrentSubmitted) return;

    setIsSubmitting(true);
    try {
      const timeSpentSeconds = Math.max(
        1,
        Math.round((Date.now() - questionStartedAt) / 1000),
      );
      const selectedOption = currentQuestion.options.find(
        (option) => option.id === selectedOptionId,
      );

      const response = await apiClient.post<SubmitAnswerResponse>(
        `/questions/${currentQuestion.id}/attempt`,
        {
          selectedOptionId,
          timeSpentSeconds,
        },
      );

      setAnsweredQuestions((previous) => [
        ...previous,
        {
          questionId: currentQuestion.id,
          selectedOptionId,
          selectedOptionLabel: selectedOption?.optionLabel ?? '',
          correctOptionId: response.data.correctOptionId,
          correctOptionLabel: response.data.correctOptionLabel,
          isCorrect: response.data.isCorrect,
          explanation: response.data.explanation,
          timeSpentSeconds,
        },
      ]);
    } catch (submitError) {
      const axiosError = submitError as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message || 'Could not submit your answer.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentQuestion,
    isCurrentSubmitted,
    questionStartedAt,
    selectedOptionId,
  ]);

  const moveToNextQuestion = useCallback(() => {
    if (!currentQuestion || !isCurrentSubmitted) return;

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedOptionId('');
    setQuestionStartedAt(Date.now());
  }, [currentIndex, currentQuestion, isCurrentSubmitted]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isLoading || hasCompletedSession || !currentQuestion) return;

      const tagName = (event.target as HTMLElement)?.tagName || '';
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;

      if (!isCurrentSubmitted && ['1', '2', '3', '4'].includes(event.key)) {
        const optionIndex = Number(event.key) - 1;
        const option = currentQuestion.options[optionIndex];
        if (option) {
          event.preventDefault();
          setSelectedOptionId(option.id);
        }
      }

      if (!isCurrentSubmitted && event.key === 'Enter' && selectedOptionId) {
        event.preventDefault();
        void submitAnswer();
      }

      if (isCurrentSubmitted && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
        moveToNextQuestion();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentQuestion,
    hasCompletedSession,
    isCurrentSubmitted,
    isLoading,
    moveToNextQuestion,
    selectedOptionId,
    submitAnswer,
  ]);

  async function toggleBookmark() {
    if (!currentQuestion || bookmarkBusy) return;

    setBookmarkBusy(true);
    try {
      if (bookmarkId) {
        await apiClient.delete(`/bookmarks/${bookmarkId}`);
        setBookmarksByQuestionId((previous) => {
          const next = { ...previous };
          delete next[currentQuestion.id];
          return next;
        });
        toast.success('Bookmark removed.');
      } else {
        const response = await apiClient.post<{ id: string }>('/bookmarks', {
          questionId: currentQuestion.id,
        });
        setBookmarksByQuestionId((previous) => ({
          ...previous,
          [currentQuestion.id]: response.data.id,
        }));
        toast.success('Question bookmarked.');
      }
    } catch {
      toast.error('Unable to update bookmark right now.');
    } finally {
      setBookmarkBusy(false);
    }
  }

  const currentAnswerTime = answeredCurrentQuestion?.timeSpentSeconds ?? 0;
  const breadcrumbItems: BreadcrumbTrailItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    isBookmarkedMode
      ? { label: 'Bookmarks', href: '/bookmarks' }
      : { label: 'Subjects', href: '/subjects' },
  ];

  if (!isBookmarkedMode && subjectId) {
    breadcrumbItems.push({
      label: 'Topics',
      href: `/subjects/${subjectId}/topics${gradeId ? `?grade=${gradeId}` : ''}`,
    });
  }

  if (!isBookmarkedMode && chapterNumber > 0) {
    breadcrumbItems.push({ label: `Chapter ${chapterNumber}` });
  }

  breadcrumbItems.push({ label: 'Practice' });

  return (
    <PracticePageShell
      onLogout={async () => {
        await logout();
        router.push('/login');
      }}
    >
      <BreadcrumbTrail items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Practice Questions
            {chapterNumber > 0 ? ` - Chapter ${chapterNumber}` : ''}
          </h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            {isBookmarkedMode
              ? 'Bookmarked-only mode. Shortcuts: 1-4 select option, Enter submit, N next.'
              : 'Shortcuts: 1-4 select option, Enter submit, N next.'}
          </p>
        </div>
        <PillNav items={difficultyPillItems} size="sm" />
      </div>

      {!isLoading &&
        !isBookmarkedMode &&
        subjectId &&
        !isContentLocked &&
        subscriptionStatus &&
        !subscriptionStatus.isSubscribed &&
        freeTierRemaining !== null &&
        freeTierRemaining >= 0 && (
          <Card className="mt-6 border-[var(--accent-color)]/45 bg-[color-mix(in_srgb,var(--accent-color)_10%,var(--surface-color))]">
            <p className="text-sm text-[var(--accent-strong)]">
              Free tier remaining in this subject:{' '}
              <span className="font-semibold">{freeTierRemaining}</span>{' '}
              question(s). Upgrade for unlimited access.
            </p>
            <Link
              href="/subscribe"
              className="mt-4 inline-flex rounded-full border border-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)] hover:bg-[var(--surface-muted)]"
            >
              Subscribe to access
            </Link>
          </Card>
        )}

      {error && (
        <Card className="mt-6 border-red-200/70 bg-red-50/60">
          <p className="text-sm text-red-700">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => fetchQuestions(difficulty)}
          >
            Retry
          </Button>
        </Card>
      )}

      {isLoading && (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!isLoading && questions.length === 0 && (
        <div className="mt-6">
          {isContentLocked ? (
            <EmptyState
              title="Subscribe to access"
              description="You have reached the free question limit for this subject. Upgrade to continue practicing."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/subscribe"
                    className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] hover:opacity-90"
                  >
                    Subscribe to access
                  </Link>
                  <Link
                    href={`/subjects/${subjectId}/topics${gradeId ? `?grade=${gradeId}` : ''}`}
                    className="rounded-full border border-[var(--border-color)] bg-[var(--surface-color)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                  >
                    Back to topics
                  </Link>
                </div>
              }
            />
          ) : (
            <EmptyState
              title="No questions available for this filter"
              description={
                isBookmarkedMode
                  ? 'Try another difficulty level or adjust bookmark filters.'
                  : 'Try another difficulty level or pick another topic.'
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => updateDifficulty('ALL')}
                  >
                    Use all difficulties
                  </Button>
                  {isBookmarkedMode ? (
                    <Link
                      href="/bookmarks"
                      className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] hover:opacity-90"
                    >
                      Back to bookmarks
                    </Link>
                  ) : subjectId ? (
                    <Link
                      href={`/subjects/${subjectId}/topics${gradeId ? `?grade=${gradeId}` : ''}`}
                      className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] hover:opacity-90"
                    >
                      Back to topics
                    </Link>
                  ) : null}
                </div>
              }
            />
          )}
        </div>
      )}

      {!isLoading && hasCompletedSession && questions.length > 0 && (
        <Card className="mt-6" padding="lg">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            Session Summary
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            You answered {score} out of {questions.length} correctly.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryStat title="Score" value={`${score}/${questions.length}`} />
            <SummaryStat
              title="Accuracy"
              value={`${questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%`}
            />
            <SummaryStat title="Time Spent" value={`${totalTimeSpent}s`} />
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Review incorrect answers
            </h3>
            {incorrectAnswers.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--accent-strong)]">
                Great work. You got every question correct.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {incorrectAnswers.map((answer) => {
                  const question = questions.find(
                    (item) => item.id === answer.questionId,
                  );
                  return (
                    <div
                      key={answer.questionId}
                      className="rounded-2xl border border-[var(--border-color)] p-3"
                    >
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {question?.questionText}
                      </p>
                      <p className="mt-1 text-xs text-red-500">
                        Your answer: {answer.selectedOptionLabel} | Correct:{' '}
                        {answer.correctOptionLabel}
                      </p>
                      {answer.explanation && (
                        <p className="mt-2 text-sm text-[var(--foreground)]/75">
                          {answer.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => fetchQuestions(difficulty)}>
              Continue practicing
            </Button>
            {subjectId ? (
              <Link
                href={`/subjects/${subjectId}/topics${gradeId ? `?grade=${gradeId}` : ''}`}
                className="rounded-full border border-[var(--border-color)] bg-[var(--surface-color)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              >
                Return to topics
              </Link>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-[var(--foreground)]/65">
            Session duration:{' '}
            {Math.round((Date.now() - sessionStartedAtRef.current) / 1000)}s
          </p>
        </Card>
      )}

      {!isLoading && !hasCompletedSession && currentQuestion && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant={badgeVariant(currentQuestion.difficulty)}>
                {currentQuestion.difficulty.toLowerCase()}
              </Badge>
              <button
                onClick={toggleBookmark}
                disabled={bookmarkBusy}
                className={`ui-pill rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isBookmarked
                    ? 'bg-[color-mix(in_srgb,var(--accent-color)_20%,var(--surface-color))] text-[var(--accent-strong)] shadow-sm shadow-[color-mix(in_srgb,var(--accent-color)_22%,transparent)]'
                    : 'bg-[var(--surface-muted)] text-[var(--foreground)]'
                }`}
              >
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>
            </div>
          </div>

          <ProgressBar
            value={currentIndex}
            max={Math.max(questions.length - 1, 1)}
            color="orange"
            size="sm"
          />

          <Card padding="lg">
            <p className="text-lg font-semibold leading-relaxed text-[var(--foreground)]">
              {currentQuestion.questionText}
            </p>
            {currentQuestion.imageUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-color)]">
                <Image
                  src={currentQuestion.imageUrl}
                  alt="Question illustration"
                  width={1200}
                  height={700}
                  className="h-auto w-full"
                />
              </div>
            )}
          </Card>

          <div className="grid gap-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOptionId === option.id;
              const isCorrectOption =
                answeredCurrentQuestion?.correctOptionId === option.id;
              const isWrongSelected =
                isCurrentSubmitted && isSelected && !isCorrectOption;

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isCurrentSubmitted}
                  onClick={() => setSelectedOptionId(option.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isCurrentSubmitted
                      ? isCorrectOption
                        ? 'border-[var(--accent-color)]/60 bg-[color-mix(in_srgb,var(--accent-color)_14%,white)] text-[var(--accent-strong)]'
                        : isWrongSelected
                          ? 'border-red-500/60 bg-red-50/70 text-red-800'
                          : 'border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--foreground)]'
                      : isSelected
                        ? 'border-[var(--accent-color)] bg-[color-mix(in_srgb,var(--accent-color)_14%,var(--surface-color))] text-[var(--foreground)] shadow-sm shadow-[color-mix(in_srgb,var(--accent-color)_24%,transparent)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--foreground)] hover:border-[var(--accent-color)]'
                  }`}
                >
                  <span className="mr-2 text-xs font-semibold text-[var(--foreground)]/65">
                    {index + 1}. {option.optionLabel}
                  </span>
                  <span>{option.optionText}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={submitAnswer}
              disabled={!selectedOptionId || isCurrentSubmitted}
              isLoading={isSubmitting}
            >
              Submit answer
            </Button>
            <Button
              variant="outline"
              onClick={moveToNextQuestion}
              disabled={!isCurrentSubmitted}
            >
              Next question
            </Button>
          </div>

          {isCurrentSubmitted && (
            <Card
              padding="md"
              className={
                answeredCurrentQuestion.isCorrect
                  ? 'border-[var(--accent-color)]/50 bg-[color-mix(in_srgb,var(--accent-color)_12%,white)]'
                  : 'border-red-500/50 bg-red-50/55'
              }
            >
              <p className={`text-sm font-semibold `}>
                {answeredCurrentQuestion.isCorrect
                  ? 'Correct answer'
                  : 'Incorrect answer'}
              </p>
              <p className="mt-1 text-xs text-[var(--foreground)]/65">
                Time spent: {currentAnswerTime}s | Correct option:{' '}
                {answeredCurrentQuestion.correctOptionLabel}
              </p>
              {answeredCurrentQuestion.explanation && (
                <p className="mt-3 text-sm text-[var(--foreground)]/75">
                  {answeredCurrentQuestion.explanation}
                </p>
              )}
            </Card>
          )}
        </div>
      )}
    </PracticePageShell>
  );
}

function badgeVariant(
  difficulty: 'EASY' | 'MEDIUM' | 'HARD',
): 'easy' | 'medium' | 'hard' {
  if (difficulty === 'EASY') return 'easy';
  if (difficulty === 'MEDIUM') return 'medium';
  return 'hard';
}

function SummaryStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">
        {title}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function PracticePageShell({
  children,
  onLogout,
}: {
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
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
