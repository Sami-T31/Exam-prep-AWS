'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useSubjects } from '@/hooks';
import { Button } from '@/components/ui';

const TOTAL_STEPS = 4;

const GRADE_OPTIONS = [9, 10, 11, 12] as const;

const DAILY_GOAL_OPTIONS = [
  { value: 10, label: '10 questions', description: 'Light practice' },
  { value: 20, label: '20 questions', description: 'Recommended' },
  { value: 30, label: '30 questions', description: 'Intensive' },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const {
    hasCompletedOnboarding,
    _ready: onboardingReady,
    hydrate,
    grade,
    prioritySubjects,
    dailyGoal,
    setGrade,
    setPrioritySubjects,
    setDailyGoal,
    completeOnboarding,
    applyDefaults,
  } = useOnboardingStore();

  const { data: subjects = [] } = useSubjects();

  const [step, setStep] = useState(0);

  useEffect(() => {
    if (user?.id) hydrate(user.id, user.onboardingCompleted ?? false);
  }, [user?.id, user?.onboardingCompleted, hydrate]);

  const canAdvance = useMemo(() => {
    if (step === 0) return grade !== null;
    if (step === 1) return prioritySubjects.length >= 1 && prioritySubjects.length <= 3;
    if (step === 2) return dailyGoal > 0;
    return true;
  }, [step, grade, prioritySubjects, dailyGoal]);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  useEffect(() => {
    if (onboardingReady && hasCompletedOnboarding) {
      router.replace('/dashboard');
    }
  }, [onboardingReady, hasCompletedOnboarding, router]);

  if (isAuthLoading || !onboardingReady || hasCompletedOnboarding) {
    return null;
  }

  function handleSkip() {
    applyDefaults();
    router.push('/dashboard');
  }

  function handleFinish() {
    completeOnboarding();
    const firstSubject = subjects.find((s) => prioritySubjects.includes(s.name));
    if (firstSubject) {
      router.push(`/practice?subjectId=${firstSubject.id}`);
    } else {
      router.push('/dashboard');
    }
  }

  function toggleSubject(name: string) {
    if (prioritySubjects.includes(name)) {
      setPrioritySubjects(prioritySubjects.filter((s) => s !== name));
    } else if (prioritySubjects.length < 3) {
      setPrioritySubjects([...prioritySubjects, name]);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="absolute inset-0 -z-10 hero-bg" />

      <div className="mb-8 flex items-center gap-2.5">
        <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-2xl">
          <span className="text-lg font-bold text-white">e</span>
        </div>
        <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">
          examprep
        </span>
      </div>

      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-[var(--border-color)]/75 bg-[var(--surface-color)] p-8 shadow-xl shadow-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]">
          {step === 0 && (
            <GradeScreen
              selected={grade}
              onSelect={setGrade}
              onSkip={handleSkip}
            />
          )}
          {step === 1 && (
            <SubjectScreen
              subjects={subjects}
              selected={prioritySubjects}
              onToggle={toggleSubject}
            />
          )}
          {step === 2 && (
            <GoalScreen selected={dailyGoal} onSelect={setDailyGoal} />
          )}
          {step === 3 && (
            <SummaryScreen
              grade={grade}
              prioritySubjects={prioritySubjects}
              dailyGoal={dailyGoal}
            />
          )}

          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="ghost" size="md" onClick={goBack}>
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS - 1 ? (
              <Button size="md" disabled={!canAdvance} onClick={goNext}>
                Continue
              </Button>
            ) : (
              <Button size="md" onClick={handleFinish}>
                Start your first question
              </Button>
            )}
          </div>
        </div>

        <ProgressDots current={step} total={TOTAL_STEPS} />
      </div>
    </div>
  );
}

function GradeScreen({
  selected,
  onSelect,
  onSkip,
}: {
  selected: number | null;
  onSelect: (g: number) => void;
  onSkip: () => void;
}) {
  return (
    <div>
      <h1 className="text-center text-xl font-bold text-[var(--foreground)]">
        What grade are you in?
      </h1>
      <p className="mt-1.5 text-center text-sm text-[var(--foreground)]/62">
        We&apos;ll personalize your experience based on your level.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {GRADE_OPTIONS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onSelect(g)}
            className={clsx(
              'flex flex-col items-center justify-center rounded-2xl border-2 px-4 py-5 text-center transition-all duration-150',
              selected === g
                ? 'border-[var(--accent-color)] bg-[color-mix(in_srgb,var(--accent-color)_10%,var(--surface-color))] shadow-md shadow-[color-mix(in_srgb,var(--accent-color)_18%,transparent)]'
                : 'border-[var(--border-color)] bg-[var(--surface-color)] hover:border-[var(--accent-color)]/50 hover:shadow-sm',
            )}
          >
            <span className="text-2xl font-bold text-[var(--foreground)]">
              {g}
            </span>
            <span className="mt-1 text-xs font-medium text-[var(--foreground)]/60">
              Grade {g}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-[var(--foreground)]/50 transition-colors hover:text-[var(--accent-strong)]"
        >
          Skip — use defaults
        </button>
      </div>
    </div>
  );
}

function SubjectScreen({
  subjects,
  selected,
  onToggle,
}: {
  subjects: Array<{ id: number; name: string }>;
  selected: string[];
  onToggle: (name: string) => void;
}) {
  const atMax = selected.length >= 3;

  return (
    <div>
      <h1 className="text-center text-xl font-bold text-[var(--foreground)]">
        Which subjects need the most work?
      </h1>
      <p className="mt-1.5 text-center text-sm text-[var(--foreground)]/62">
        Select 1 to 3 subjects you want to focus on.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {subjects.map((s) => {
          const isSelected = selected.includes(s.name);
          const isDisabled = atMax && !isSelected;

          return (
            <button
              key={s.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onToggle(s.name)}
              className={clsx(
                'rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all duration-150',
                isSelected
                  ? 'border-[var(--accent-color)] bg-[color-mix(in_srgb,var(--accent-color)_10%,var(--surface-color))] text-[var(--accent-strong)] shadow-sm shadow-[color-mix(in_srgb,var(--accent-color)_16%,transparent)]'
                  : 'border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--foreground)]',
                isDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:border-[var(--accent-color)]/50',
              )}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-[var(--foreground)]/50">
        {selected.length}/3 selected
      </p>
    </div>
  );
}

function GoalScreen({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (g: number) => void;
}) {
  return (
    <div>
      <h1 className="text-center text-xl font-bold text-[var(--foreground)]">
        Set your daily question goal
      </h1>
      <p className="mt-1.5 text-center text-sm text-[var(--foreground)]/62">
        How many questions do you want to tackle each day?
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {DAILY_GOAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={clsx(
              'flex items-center justify-between rounded-2xl border-2 px-5 py-4 transition-all duration-150',
              selected === opt.value
                ? 'border-[var(--accent-color)] bg-[color-mix(in_srgb,var(--accent-color)_10%,var(--surface-color))] shadow-md shadow-[color-mix(in_srgb,var(--accent-color)_18%,transparent)]'
                : 'border-[var(--border-color)] bg-[var(--surface-color)] hover:border-[var(--accent-color)]/50 hover:shadow-sm',
            )}
          >
            <div className="text-left">
              <p className="text-base font-bold text-[var(--foreground)]">
                {opt.label}
              </p>
              <p className="mt-0.5 text-xs text-[var(--foreground)]/60">
                {opt.description}
              </p>
            </div>
            <div
              className={clsx(
                'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                selected === opt.value
                  ? 'border-[var(--accent-color)] bg-[var(--accent-color)]'
                  : 'border-[var(--border-color)]',
              )}
            >
              {selected === opt.value && (
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryScreen({
  grade,
  prioritySubjects,
  dailyGoal,
}: {
  grade: number | null;
  prioritySubjects: string[];
  dailyGoal: number;
}) {
  return (
    <div>
      <div className="flex flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent-color)_15%,var(--surface-color))]">
          <svg className="h-7 w-7 text-[var(--accent-strong)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mt-4 text-center text-xl font-bold text-[var(--foreground)]">
          You&apos;re all set!
        </h1>
        <p className="mt-1.5 text-center text-sm text-[var(--foreground)]/62">
          Here&apos;s a summary of your choices.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <SummaryRow label="Grade" value={grade ? `Grade ${grade}` : '—'} />
        <SummaryRow
          label="Focus subjects"
          value={prioritySubjects.length > 0 ? prioritySubjects.join(', ') : '—'}
        />
        <SummaryRow label="Daily goal" value={`${dailyGoal} questions/day`} />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] px-4 py-3">
      <span className="text-sm text-[var(--foreground)]/60">{label}</span>
      <span className="text-sm font-semibold text-[var(--foreground)]">
        {value}
      </span>
    </div>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={clsx(
            'h-2 rounded-full transition-all duration-200',
            i === current
              ? 'w-6 bg-[var(--accent-color)]'
              : i < current
                ? 'w-2 bg-[var(--accent-color)]/50'
                : 'w-2 bg-[var(--border-color)]',
          )}
        />
      ))}
      <span className="ml-2 text-xs text-[var(--foreground)]/45">
        {current + 1}/{total}
      </span>
    </div>
  );
}
