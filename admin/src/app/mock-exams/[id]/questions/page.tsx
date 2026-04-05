'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { adminApiClient } from '@/lib/adminApi';
import { clearAdminTokens, getAdminAccessToken } from '@/lib/adminAuth';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type OptionLabel = 'A' | 'B' | 'C' | 'D';

interface Topic {
  id: number;
  name: string;
  subjectId: number;
  gradeId: number;
}

interface QuestionOption {
  id: string;
  optionLabel: OptionLabel;
  optionText: string;
  isCorrect: boolean;
}

interface MockExamQuestion {
  questionId: string;
  sortOrder: number;
  questionText: string;
  explanation: string | null;
  difficulty: Difficulty;
  topic: { id: number; name: string };
  options: QuestionOption[];
}

interface QuestionEditorData {
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
    targetQuestionCount: number;
    currentQuestionCount: number;
    subject: { id: number; name: string };
    grade: { id: number; gradeNumber: number };
  };
  questions: MockExamQuestion[];
}

interface ApiErrorLike {
  response?: {
    status?: number;
    data?: { message?: string | string[] };
  };
}

interface QuestionFormInput {
  questionText: string;
  explanation: string;
  topicId: number;
  difficulty: Difficulty;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: OptionLabel;
  year: string;
}

const EMPTY_FORM: QuestionFormInput = {
  questionText: '',
  explanation: '',
  topicId: 0,
  difficulty: 'EASY',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctOption: 'A',
  year: '',
};

function isAuthError(error: unknown): boolean {
  const status = (error as ApiErrorLike)?.response?.status;
  return status === 401 || status === 403;
}

function parseErrorMessage(error: unknown, fallback: string): string {
  const message = (error as ApiErrorLike)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

function toDifficulty(value: string): Difficulty {
  if (value === 'MEDIUM' || value === 'HARD') return value;
  return 'EASY';
}

function toOptionLabel(value: string): OptionLabel {
  if (value === 'B' || value === 'C' || value === 'D') return value;
  return 'A';
}

function toFormInput(question?: MockExamQuestion): QuestionFormInput {
  if (!question) return { ...EMPTY_FORM };
  const findOption = (label: OptionLabel) =>
    question.options.find((option) => option.optionLabel === label)
      ?.optionText ?? '';
  const correctOption =
    question.options.find((option) => option.isCorrect)?.optionLabel ?? 'A';

  return {
    questionText: question.questionText,
    explanation: question.explanation ?? '',
    topicId: question.topic.id,
    difficulty: question.difficulty,
    optionA: findOption('A'),
    optionB: findOption('B'),
    optionC: findOption('C'),
    optionD: findOption('D'),
    correctOption,
    year: '',
  };
}

export default function MockExamQuestionsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const mockExamId = params?.id ?? '';

  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editorData, setEditorData] = useState<QuestionEditorData | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [formInput, setFormInput] = useState<QuestionFormInput>({
    ...EMPTY_FORM,
  });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );

  const availableTopics = useMemo(() => {
    if (!editorData) return [];
    return topics.filter((topic) => topic.gradeId === editorData.exam.grade.id);
  }, [editorData, topics]);

  const questionLimitReached = useMemo(() => {
    if (!editorData) return false;
    return (
      editorData.exam.currentQuestionCount >=
      editorData.exam.targetQuestionCount
    );
  }, [editorData]);

  const loadData = useCallback(async () => {
    if (!mockExamId) return;
    if (!getAdminAccessToken()) {
      router.replace('/login');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const editorResponse = await adminApiClient.get<QuestionEditorData>(
        `/mock-exams/${mockExamId}/questions`,
      );
      const data = editorResponse.data;
      const topicsResponse = await adminApiClient.get<Topic[]>(
        '/admin/topics',
        {
          params: { subjectId: data.exam.subject.id },
        },
      );
      setEditorData(data);
      setTopics(topicsResponse.data);
    } catch (caughtError: unknown) {
      if (isAuthError(caughtError)) {
        clearAdminTokens();
        router.replace('/login');
        return;
      }
      setError(
        parseErrorMessage(caughtError, 'Unable to load mock exam editor.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [mockExamId, router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function withBusy(action: () => Promise<void>) {
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (caughtError: unknown) {
      if (isAuthError(caughtError)) {
        clearAdminTokens();
        router.replace('/login');
        return;
      }
      setError(parseErrorMessage(caughtError, 'Request failed.'));
    } finally {
      setIsBusy(false);
    }
  }

  function startEditingQuestion(question: MockExamQuestion) {
    setEditingQuestionId(question.questionId);
    setFormInput(toFormInput(question));
    setNotice('Editing existing question. Save to apply changes.');
    setError('');
  }

  function resetForm() {
    setFormInput({ ...EMPTY_FORM });
    setEditingQuestionId(null);
  }

  async function saveQuestion() {
    if (!mockExamId || !editorData) return;

    await withBusy(async () => {
      if (!formInput.topicId) {
        setError('Please select a topic/chapter.');
        return;
      }

      const payload = {
        questionText: formInput.questionText,
        explanation: formInput.explanation || undefined,
        topicId: formInput.topicId,
        difficulty: formInput.difficulty,
        year: formInput.year ? Number(formInput.year) : undefined,
        options: [
          {
            optionLabel: 'A',
            optionText: formInput.optionA,
            isCorrect: formInput.correctOption === 'A',
          },
          {
            optionLabel: 'B',
            optionText: formInput.optionB,
            isCorrect: formInput.correctOption === 'B',
          },
          {
            optionLabel: 'C',
            optionText: formInput.optionC,
            isCorrect: formInput.correctOption === 'C',
          },
          {
            optionLabel: 'D',
            optionText: formInput.optionD,
            isCorrect: formInput.correctOption === 'D',
          },
        ],
      };

      if (editingQuestionId) {
        await adminApiClient.patch(
          `/mock-exams/${mockExamId}/questions/${editingQuestionId}`,
          payload,
        );
        setNotice('Mock exam question updated.');
      } else {
        if (questionLimitReached) {
          setError(
            `Question limit reached (${editorData.exam.targetQuestionCount}). Remove a question before adding another.`,
          );
          return;
        }
        await adminApiClient.post(
          `/mock-exams/${mockExamId}/questions`,
          payload,
        );
        setNotice('Mock exam question added.');
      }

      resetForm();
      await loadData();
    });
  }

  async function deleteMockExamQuestion(questionId: string) {
    if (!mockExamId) return;
    await withBusy(async () => {
      await adminApiClient.delete(
        `/mock-exams/${mockExamId}/questions/${questionId}`,
      );
      setNotice('Mock exam question removed.');
      if (editingQuestionId === questionId) {
        resetForm();
      }
      await loadData();
    });
  }

  function submitToExamList() {
    router.push('/dashboard');
  }

  if (isLoading) {
    return (
      <div className="container">Loading mock exam question editor...</div>
    );
  }

  if (!editorData) {
    return <div className="container">Mock exam not found.</div>;
  }

  const remainingCount =
    editorData.exam.targetQuestionCount - editorData.exam.currentQuestionCount;

  return (
    <div>
      <header className="topbar">
        <div
          className="container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong>Mock Exam Question Editor</strong>
            <div className="muted" style={{ fontSize: 12 }}>
              This page manages mock-exam-only questions (separate from practice
              question flow).
            </div>
          </div>
          <Link className="btn" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="container grid" style={{ gap: 14 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{editorData.exam.title}</h2>
          <div className="muted">
            Subject: {editorData.exam.subject.name} | Grade{' '}
            {editorData.exam.grade.gradeNumber} | Duration:{' '}
            {editorData.exam.durationMinutes} min | Target Questions:{' '}
            {editorData.exam.targetQuestionCount} | Added:{' '}
            {editorData.exam.currentQuestionCount}
          </div>
          {questionLimitReached ? (
            <p className="ok" style={{ marginTop: 10 }}>
              Question limit reached. You can now submit this mock exam to the
              exam list.
            </p>
          ) : (
            <p className="muted" style={{ marginTop: 10 }}>
              Add {remainingCount} more question
              {remainingCount === 1 ? '' : 's'}.
            </p>
          )}
          {questionLimitReached && (
            <button
              className="btn primary"
              onClick={submitToExamList}
              style={{ marginTop: 8 }}
            >
              Submit Mock Exam
            </button>
          )}
        </div>

        {error && <p className="error">{error}</p>}
        {notice && <p className="ok">{notice}</p>}

        <div className="card">
          <h3>
            {editingQuestionId
              ? 'Edit Mock Exam Question'
              : 'Create Mock Exam Question'}
          </h3>
          <div className="grid two">
            <label>
              <div className="muted" style={{ marginBottom: 6 }}>
                Question Text
              </div>
              <textarea
                className="textarea"
                value={formInput.questionText}
                onChange={(event) =>
                  setFormInput((previous) => ({
                    ...previous,
                    questionText: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <div className="muted" style={{ marginBottom: 6 }}>
                Explanation
              </div>
              <textarea
                className="textarea"
                value={formInput.explanation}
                onChange={(event) =>
                  setFormInput((previous) => ({
                    ...previous,
                    explanation: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="grid three" style={{ marginTop: 10 }}>
            <label>
              <div className="muted" style={{ marginBottom: 6 }}>
                Topic (Chapter)
              </div>
              <select
                className="select"
                value={formInput.topicId}
                onChange={(event) =>
                  setFormInput((previous) => ({
                    ...previous,
                    topicId: Number(event.target.value),
                  }))
                }
              >
                <option value={0}>Select chapter</option>
                {availableTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="muted" style={{ marginBottom: 6 }}>
                Difficulty
              </div>
              <select
                className="select"
                value={formInput.difficulty}
                onChange={(event) =>
                  setFormInput((previous) => ({
                    ...previous,
                    difficulty: toDifficulty(event.target.value),
                  }))
                }
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </label>

            <label>
              <div className="muted" style={{ marginBottom: 6 }}>
                Year (optional)
              </div>
              <input
                className="input"
                value={formInput.year}
                onChange={(event) =>
                  setFormInput((previous) => ({
                    ...previous,
                    year: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="grid two" style={{ marginTop: 10 }}>
            <label>
              <div className="muted" style={{ marginBottom: 6 }}>
                Option A
              </div>
              <input
                className="input"
                value={formInput.optionA}
                onChange={(event) =>
                  setFormInput((previous) => ({
                    ...previous,
                    optionA: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <div className="muted" style={{ marginBottom: 6 }}>
                Option B
              </div>
              <input
                className="input"
                value={formInput.optionB}
                onChange={(event) =>
                  setFormInput((previous) => ({
                    ...previous,
                    optionB: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <div className="muted" style={{ marginBottom: 6 }}>
                Option C
              </div>
              <input
                className="input"
                value={formInput.optionC}
                onChange={(event) =>
                  setFormInput((previous) => ({
                    ...previous,
                    optionC: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <div className="muted" style={{ marginBottom: 6 }}>
                Option D
              </div>
              <input
                className="input"
                value={formInput.optionD}
                onChange={(event) =>
                  setFormInput((previous) => ({
                    ...previous,
                    optionD: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="grid two" style={{ marginTop: 10 }}>
            <label>
              <div className="muted" style={{ marginBottom: 6 }}>
                Correct Option
              </div>
              <select
                className="select"
                value={formInput.correctOption}
                onChange={(event) =>
                  setFormInput((previous) => ({
                    ...previous,
                    correctOption: toOptionLabel(event.target.value),
                  }))
                }
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </label>
            <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
              <button
                className="btn primary"
                disabled={
                  isBusy || (!editingQuestionId && questionLimitReached)
                }
                onClick={() => void saveQuestion()}
              >
                {editingQuestionId ? 'Save Changes' : 'Add Mock Exam Question'}
              </button>
              {editingQuestionId && (
                <button className="btn" disabled={isBusy} onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Mock Exam Question List</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Chapter</th>
                <th>Difficulty</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {editorData.questions.map((question, index) => (
                <tr key={question.questionId}>
                  <td>{index + 1}</td>
                  <td>{question.questionText}</td>
                  <td>{question.topic.name}</td>
                  <td>{question.difficulty}</td>
                  <td>
                    <button
                      className="btn"
                      style={{ marginRight: 8 }}
                      disabled={isBusy}
                      onClick={() => startEditingQuestion(question)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn"
                      disabled={isBusy}
                      onClick={() =>
                        void deleteMockExamQuestion(question.questionId)
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
