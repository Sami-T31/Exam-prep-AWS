'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { clearSession, MockExamQuestion, MockExamSessionState, saveFlaggedQuestionIds, saveSession } from '@/lib/mockExamSession';
import { useAuthStore } from '@/stores/authStore';
import {
  BreadcrumbTrail,
  Button,
  Card,
  EmptyState,
  Modal,
  PillNav,
  Skeleton,
} from '@/components/ui';

interface Grade {
  id: number;
  gradeNumber: number;
}

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
  exams: MockExam[];
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

export default function MockExamSubjectsPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [confirmExam, setConfirmExam] = useState<MockExam | null>(null);

  const filteredExams = useMemo(
    () => selectedGradeId ? mockExams.filter((e) => e.grade.id === selectedGradeId) : mockExams,
    [mockExams, selectedGradeId],
  );

  const subjectCards = useMemo<SubjectCardItem[]>(() => {
    const subjectMap = new Map<number, SubjectCardItem>();
    for (const exam of filteredExams) {
      const existing = subjectMap.get(exam.subject.id);
      if (existing) {
        existing.examCount += 1;
        existing.exams.push(exam);
      } else {
        subjectMap.set(exam.subject.id, {
          subjectId: exam.subject.id,
          subjectName: exam.subject.name,
          examCount: 1,
          exams: [exam],
        });
      }
    }
    return Array.from(subjectMap.values()).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName),
    );
  }, [filteredExams]);

  const gradePillItems = useMemo(() => {
    const items = [
      {
        key: 'all',
        label: 'All Grades',
        active: selectedGradeId === null,
        onClick: () => setSelectedGradeId(null),
      },
    ];
    for (const g of grades) {
      items.push({
        key: String(g.id),
        label: `Grade ${g.gradeNumber}`,
        active: selectedGradeId === g.id,
        onClick: () => setSelectedGradeId(g.id),
      });
    }
    return items;
  }, [grades, selectedGradeId]);

  async function loadData() {
    setIsLoading(true);
    setError('');
    try {
      const [examsRes, gradesRes] = await Promise.all([
        apiClient.get<MockExam[]>('/mock-exams'),
        apiClient.get<Grade[]>('/grades'),
      ]);
      setMockExams(examsRes.data);
      setGrades(gradesRes.data);
    } catch {
      setError('Unable to load mock exam subjects right now.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function startExam(exam: MockExam) {
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
      setConfirmExam(null);
    }
  }

  function handleSubjectClick(subject: SubjectCardItem) {
    if (selectedGradeId !== null) {
      const exam = subject.exams[0];
      if (exam) {
        setConfirmExam(exam);
        return;
      }
    }
    router.push(`/mock-exams/subjects/${subject.subjectId}/grades`);
  }

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
            {selectedGradeId
              ? 'Click a subject to start the exam directly.'
              : 'Filter by grade, or click a subject to pick a grade.'}
          </p>
          {!isLoading && grades.length > 0 && (
            <PillNav items={gradePillItems} size="sm" className="mt-4" />
          )}
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
                description={
                  selectedGradeId
                    ? 'No exams for this grade. Try another grade or view all.'
                    : 'An admin needs to publish mock exams before timed practice can begin.'
                }
                action={
                  selectedGradeId ? (
                    <Button variant="outline" size="sm" onClick={() => setSelectedGradeId(null)}>
                      Show all grades
                    </Button>
                  ) : undefined
                }
              />
            </div>
          )}

          {subjectCards.map((subject) => (
            <button
              key={subject.subjectId}
              type="button"
              onClick={() => handleSubjectClick(subject)}
              className="block w-full text-left"
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
            </button>
          ))}
        </section>
      </main>

      <Modal
        isOpen={!!confirmExam}
        onClose={() => (isStarting ? undefined : setConfirmExam(null))}
        title="Start Mock Exam"
      >
        {confirmExam && (
          <div>
            <p className="text-sm text-[var(--foreground)]/75">
              You are about to start <span className="font-semibold">{confirmExam.title}</span>.
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]/75">
              <li>Time limit: {confirmExam.durationMinutes} minutes</li>
              <li>You can navigate between questions before final submit</li>
              <li>Exam auto-submits when timer reaches zero</li>
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmExam(null)} disabled={isStarting}>
                Cancel
              </Button>
              <Button onClick={() => startExam(confirmExam)} isLoading={isStarting}>
                Start now
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
