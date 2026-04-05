'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApiClient } from '@/lib/adminApi';
import {
  clearAdminTokens,
  getAdminAccessToken,
  getAdminRefreshToken,
} from '@/lib/adminAuth';

type TabKey =
  | 'overview'
  | 'questions'
  | 'subjects_topics'
  | 'mock_exams'
  | 'payments'
  | 'users';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type DifficultyFilter = 'ALL' | Difficulty;
type QuestionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type QuestionStatusFilter = 'ALL' | QuestionStatus;
type OptionLabel = 'A' | 'B' | 'C' | 'D';

interface Stream {
  id: number;
  name: string;
  slug: string;
}

interface Subject {
  id: number;
  name: string;
  icon: string | null;
  streams?: string[];
}

interface AdminSubject {
  id: number;
  name: string;
  icon: string | null;
  streamIds: number[];
}

interface Grade {
  id: number;
  gradeNumber: number;
}

interface Topic {
  id: number;
  name: string;
  subjectId: number;
  gradeId: number;
  sortOrder: number;
  subject?: { id: number; name: string };
  grade?: { id: number; gradeNumber: number };
}

interface QuestionOption {
  id: string;
  optionLabel: string;
  optionText: string;
}

interface QuestionListItem {
  id: string;
  questionText: string;
  explanation: string | null;
  difficulty: Difficulty;
  status: QuestionStatus;
  topicId: number;
  gradeId: number;
  topic: { id: number; name: string; subject?: { id: number; name: string } };
  grade: { id: number; gradeNumber: number };
  options: QuestionOption[];
}

interface QuestionsResponse {
  data: QuestionListItem[];
  total: number;
}

interface AdminOverview {
  totalUsers: number;
  activeSubscribers: number;
  newUsersThisWeek: number;
  totalQuestions: number;
  pendingPayments: number;
  mockExams: number;
  totalRevenueEtb: number;
  revenueLast30DaysEtb: number;
}

interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'STUDENT' | 'ADMIN';
  createdAt: string;
  activeSubscription: {
    id: string;
    plan: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    status: 'ACTIVE';
    expiresAt: string;
  } | null;
  counts: {
    questionAttempts: number;
    mockExamAttempts: number;
    bookmarks: number;
    payments: number;
  };
}

interface AdminUsersResponse {
  total: number;
  limit: number;
  offset: number;
  data: AdminUserListItem[];
}

interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'STUDENT' | 'ADMIN';
  createdAt: string;
  subscriptions: Array<{
    id: string;
    plan: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    startsAt: string;
    expiresAt: string;
    createdAt: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    method: 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER';
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
    createdAt: string;
    verifiedAt: string | null;
  }>;
  questionAttempts: Array<{
    id: string;
    questionId: string;
    isCorrect: boolean;
    attemptedAt: string;
    question: {
      questionText: string;
      topic: { name: string; subject: { name: string } };
    };
  }>;
  mockExamAttempts: Array<{
    id: string;
    score: number;
    total: number;
    startedAt: string;
    completedAt: string | null;
    mockExam: {
      title: string;
      subject: { name: string };
      grade: { gradeNumber: number };
    };
  }>;
}

interface PendingPayment {
  id: string;
  amount: number;
  currency: string;
  method: 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER';
  status: 'PENDING';
  createdAt: string;
  user: { id: string; name: string; email: string };
  subscription: { plan: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' };
}

interface MockExam {
  id: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  subject: { id: number; name: string };
  grade: { id: number; gradeNumber: number };
}

interface ApiErrorLike {
  response?: {
    status?: number;
    data?: { message?: string | string[] };
  };
}

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

function toDifficultyFilter(value: string): DifficultyFilter {
  if (value === 'EASY' || value === 'MEDIUM' || value === 'HARD') return value;
  return 'ALL';
}

function toDifficulty(value: string): Difficulty {
  if (value === 'MEDIUM' || value === 'HARD') return value;
  return 'EASY';
}

function toOptionLabel(value: string): OptionLabel {
  if (value === 'B' || value === 'C' || value === 'D') return value;
  return 'A';
}

function toQuestionStatus(value: string): QuestionStatus {
  if (value === 'PUBLISHED' || value === 'ARCHIVED') return value;
  return 'DRAFT';
}

function toQuestionStatusFilter(value: string): QuestionStatusFilter {
  if (value === 'DRAFT' || value === 'PUBLISHED' || value === 'ARCHIVED') {
    return value;
  }
  return 'ALL';
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [adminSubjects, setAdminSubjects] = useState<AdminSubject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [draftQuestions, setDraftQuestions] = useState<QuestionListItem[]>([]);
  const [questionTotal, setQuestionTotal] = useState(0);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] =
    useState<AdminUserDetail | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userSubscriptionPlan, setUserSubscriptionPlan] = useState<
    'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  >('MONTHLY');

  const [questionSubjectFilter, setQuestionSubjectFilter] = useState<
    number | ''
  >('');
  const [questionGradeFilter, setQuestionGradeFilter] = useState<number | ''>(
    '',
  );
  const [questionTopicFilter, setQuestionTopicFilter] = useState<number | ''>(
    '',
  );
  const [questionDifficultyFilter, setQuestionDifficultyFilter] =
    useState<DifficultyFilter>('ALL');
  const [questionStatusFilter, setQuestionStatusFilter] =
    useState<QuestionStatusFilter>('ALL');

  const [createQuestionInput, setCreateQuestionInput] = useState({
    questionText: '',
    explanation: '',
    difficulty: 'EASY' as Difficulty,
    topicId: 0,
    gradeId: 0,
    year: '',
    status: 'DRAFT' as QuestionStatus,
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A' as OptionLabel,
  });
  const [createQuestionSubjectId, setCreateQuestionSubjectId] = useState<
    number | ''
  >('');

  const [questionEditId, setQuestionEditId] = useState<string | null>(null);
  const [questionEditInput, setQuestionEditInput] = useState({
    questionText: '',
    explanation: '',
    difficulty: 'EASY' as Difficulty,
    status: 'PUBLISHED' as QuestionStatus,
  });

  const [createSubjectInput, setCreateSubjectInput] = useState({
    name: '',
    icon: '',
    streamIds: [] as number[],
  });
  const [subjectEditId, setSubjectEditId] = useState<number | null>(null);
  const [subjectEditInput, setSubjectEditInput] = useState({
    name: '',
    icon: '',
    streamIds: [] as number[],
  });

  const [createTopicInput, setCreateTopicInput] = useState({
    name: '',
    subjectId: 0,
    gradeId: 0,
    sortOrder: 0,
  });
  const [topicEditId, setTopicEditId] = useState<number | null>(null);
  const [topicEditInput, setTopicEditInput] = useState({
    name: '',
    subjectId: 0,
    gradeId: 0,
    sortOrder: 0,
  });
  const [subjectNameFilter, setSubjectNameFilter] = useState('');
  const [topicNameFilter, setTopicNameFilter] = useState('');
  const [topicSubjectFilter, setTopicSubjectFilter] = useState<number | ''>('');
  const [topicGradeFilter, setTopicGradeFilter] = useState<number | ''>('');

  const [createMockExamInput, setCreateMockExamInput] = useState({
    title: '',
    subjectId: 0,
    gradeId: 0,
    durationMinutes: 60,
    questionCount: 10,
  });

  const [mockExamEditId, setMockExamEditId] = useState<string | null>(null);
  const [mockExamEditInput, setMockExamEditInput] = useState({
    title: '',
    durationMinutes: 60,
  });

  const createQuestionTopicOptions = useMemo(() => {
    if (!createQuestionSubjectId || !createQuestionInput.gradeId) return [];
    return topics.filter(
      (topic) =>
        topic.subjectId === createQuestionSubjectId &&
        topic.gradeId === createQuestionInput.gradeId,
    );
  }, [createQuestionInput.gradeId, createQuestionSubjectId, topics]);

  const questionFilterTopicOptions = useMemo(() => {
    return topics.filter((topic) => {
      const subjectMatch = questionSubjectFilter
        ? topic.subjectId === questionSubjectFilter
        : true;
      const gradeMatch = questionGradeFilter
        ? topic.gradeId === questionGradeFilter
        : true;
      return subjectMatch && gradeMatch;
    });
  }, [questionGradeFilter, questionSubjectFilter, topics]);

  const filteredAdminSubjects = useMemo(() => {
    const query = subjectNameFilter.trim().toLowerCase();
    if (!query) return adminSubjects;
    return adminSubjects.filter((subject) =>
      subject.name.toLowerCase().includes(query),
    );
  }, [adminSubjects, subjectNameFilter]);

  const filteredTopics = useMemo(() => {
    const query = topicNameFilter.trim().toLowerCase();
    return topics.filter((topic) => {
      const matchesName = query
        ? topic.name.toLowerCase().includes(query)
        : true;
      const matchesSubject = topicSubjectFilter
        ? topic.subjectId === topicSubjectFilter
        : true;
      const matchesGrade = topicGradeFilter
        ? topic.gradeId === topicGradeFilter
        : true;
      return matchesName && matchesSubject && matchesGrade;
    });
  }, [topicGradeFilter, topicNameFilter, topicSubjectFilter, topics]);

  function authHeaders() {
    const refreshToken = getAdminRefreshToken();
    return refreshToken ? { refreshToken } : undefined;
  }

  async function withBusy(action: () => Promise<void>) {
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (caughtError: unknown) {
      if (isAuthError(caughtError)) {
        clearAdminTokens();
        router.push('/login');
        return;
      }
      setError(parseErrorMessage(caughtError, 'Request failed.'));
    } finally {
      setIsBusy(false);
    }
  }

  const loadAllData = useCallback(async () => {
    if (!getAdminAccessToken()) {
      router.replace('/login');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const queryParams: Record<string, string | number> = {
        limit: 50,
        offset: 0,
      };
      if (questionSubjectFilter) queryParams.subjectId = questionSubjectFilter;
      if (questionGradeFilter) queryParams.gradeId = questionGradeFilter;
      if (questionTopicFilter) queryParams.topicId = questionTopicFilter;
      if (questionDifficultyFilter !== 'ALL')
        queryParams.difficulty = questionDifficultyFilter;
      if (questionStatusFilter !== 'ALL')
        queryParams.status = questionStatusFilter;

      const [
        overviewResponse,
        streamsResponse,
        subjectsResponse,
        adminSubjectsResponse,
        gradesResponse,
        topicsResponse,
        questionsResponse,
        draftQuestionsResponse,
        pendingPaymentsResponse,
        mockExamResponse,
        usersResponse,
      ] = await Promise.all([
        adminApiClient.get<AdminOverview>('/admin/overview'),
        adminApiClient.get<Stream[]>('/streams'),
        adminApiClient.get<Subject[]>('/subjects'),
        adminApiClient.get<AdminSubject[]>('/admin/subjects'),
        adminApiClient.get<Grade[]>('/grades'),
        adminApiClient.get<Topic[]>('/admin/topics'),
        adminApiClient.get<QuestionsResponse>('/admin/questions', {
          params: queryParams,
        }),
        adminApiClient.get<QuestionsResponse>('/admin/questions', {
          params: { status: 'DRAFT', limit: 20, offset: 0 },
        }),
        adminApiClient.get<PendingPayment[]>('/payments/pending'),
        adminApiClient.get<MockExam[]>('/mock-exams'),
        adminApiClient.get<AdminUsersResponse>('/admin/users', {
          params: {
            search: userSearch.trim() || undefined,
            limit: 20,
            offset: 0,
          },
        }),
      ]);

      setOverview(overviewResponse.data);
      setStreams(streamsResponse.data);
      setSubjects(subjectsResponse.data);
      setAdminSubjects(adminSubjectsResponse.data);
      setGrades(gradesResponse.data);
      setTopics(topicsResponse.data);
      setQuestions(questionsResponse.data.data);
      setDraftQuestions(draftQuestionsResponse.data.data);
      setQuestionTotal(questionsResponse.data.total);
      setPendingPayments(pendingPaymentsResponse.data);
      setMockExams(mockExamResponse.data);
      setUsers(usersResponse.data.data);
      setUsersTotal(usersResponse.data.total);
    } catch (caughtError: unknown) {
      if (isAuthError(caughtError)) {
        clearAdminTokens();
        router.push('/login');
        return;
      }
      setError('Unable to load admin data.');
    } finally {
      setIsLoading(false);
    }
  }, [
    questionDifficultyFilter,
    questionGradeFilter,
    questionTopicFilter,
    questionStatusFilter,
    questionSubjectFilter,
    router,
    userSearch,
  ]);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  async function handleLogout() {
    const refreshToken = getAdminRefreshToken();
    try {
      if (refreshToken) {
        await adminApiClient.post('/auth/logout', authHeaders());
      }
    } catch {
      // Ignore logout errors.
    } finally {
      clearAdminTokens();
      router.push('/login');
    }
  }

  async function createQuestion() {
    await withBusy(async () => {
      if (!createQuestionSubjectId) {
        setError('Please select a subject.');
        return;
      }
      if (!createQuestionInput.gradeId) {
        setError('Please select a grade.');
        return;
      }
      if (!createQuestionInput.topicId) {
        setError('Please select a chapter/topic.');
        return;
      }

      const payload = {
        questionText: createQuestionInput.questionText,
        explanation: createQuestionInput.explanation || undefined,
        difficulty: createQuestionInput.difficulty,
        topicId: Number(createQuestionInput.topicId),
        gradeId: Number(createQuestionInput.gradeId),
        year: createQuestionInput.year
          ? Number(createQuestionInput.year)
          : undefined,
        status: createQuestionInput.status,
        options: [
          {
            optionLabel: 'A',
            optionText: createQuestionInput.optionA,
            isCorrect: createQuestionInput.correctOption === 'A',
          },
          {
            optionLabel: 'B',
            optionText: createQuestionInput.optionB,
            isCorrect: createQuestionInput.correctOption === 'B',
          },
          {
            optionLabel: 'C',
            optionText: createQuestionInput.optionC,
            isCorrect: createQuestionInput.correctOption === 'C',
          },
          {
            optionLabel: 'D',
            optionText: createQuestionInput.optionD,
            isCorrect: createQuestionInput.correctOption === 'D',
          },
        ],
      };
      await adminApiClient.post('/admin/questions', payload);
      setNotice('Question created.');
      setCreateQuestionInput({
        questionText: '',
        explanation: '',
        difficulty: 'EASY',
        topicId: 0,
        gradeId: 0,
        year: '',
        status: 'DRAFT',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
      });
      setCreateQuestionSubjectId('');
      await loadAllData();
    });
  }

  async function updateQuestion(id: string) {
    await withBusy(async () => {
      await adminApiClient.patch(`/admin/questions/${id}`, {
        questionText: questionEditInput.questionText,
        explanation: questionEditInput.explanation,
        difficulty: questionEditInput.difficulty,
        status: questionEditInput.status,
      });
      setNotice('Question updated.');
      setQuestionEditId(null);
      await loadAllData();
    });
  }

  async function deleteQuestion(id: string) {
    await withBusy(async () => {
      await adminApiClient.delete(`/admin/questions/${id}`);
      setNotice('Question deleted.');
      await loadAllData();
    });
  }

  async function bulkImportQuestions(file: File) {
    await withBusy(async () => {
      const formData = new FormData();
      formData.append('file', file);
      await adminApiClient.post('/admin/questions/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNotice('Bulk import processed.');
      await loadAllData();
    });
  }

  async function createSubject() {
    await withBusy(async () => {
      await adminApiClient.post('/admin/subjects', createSubjectInput);
      setNotice('Subject created.');
      setCreateSubjectInput({ name: '', icon: '', streamIds: [] });
      await loadAllData();
    });
  }

  async function deleteSubject(id: number) {
    await withBusy(async () => {
      await adminApiClient.delete(`/admin/subjects/${id}`);
      setNotice('Subject deleted.');
      await loadAllData();
    });
  }

  async function createTopic() {
    await withBusy(async () => {
      await adminApiClient.post('/admin/topics', createTopicInput);
      setNotice('Topic created.');
      setCreateTopicInput({ name: '', subjectId: 0, gradeId: 0, sortOrder: 0 });
      await loadAllData();
    });
  }

  async function deleteTopic(id: number) {
    await withBusy(async () => {
      await adminApiClient.delete(`/admin/topics/${id}`);
      setNotice('Topic deleted.');
      await loadAllData();
    });
  }

  async function createMockExam() {
    await withBusy(async () => {
      const response = await adminApiClient.post<{ id: string }>(
        '/mock-exams',
        {
          ...createMockExamInput,
          shouldAutoGenerateQuestions: false,
        },
      );
      setNotice('Mock exam created. Opening question editor...');
      setCreateMockExamInput({
        title: '',
        subjectId: 0,
        gradeId: 0,
        durationMinutes: 60,
        questionCount: 10,
      });
      router.push(`/mock-exams/${response.data.id}/questions`);
      await loadAllData();
    });
  }

  async function updateMockExam(id: string) {
    await withBusy(async () => {
      await adminApiClient.patch(`/mock-exams/${id}`, mockExamEditInput);
      setNotice('Mock exam updated.');
      setMockExamEditId(null);
      await loadAllData();
    });
  }

  async function deleteMockExam(id: string) {
    await withBusy(async () => {
      await adminApiClient.delete(`/mock-exams/${id}`);
      setNotice('Mock exam deleted.');
      await loadAllData();
    });
  }

  async function verifyPayment(id: string, isApproved: boolean) {
    await withBusy(async () => {
      await adminApiClient.post(`/payments/${id}/verify`, {
        isApproved,
        notes: '',
      });
      setNotice(`Payment ${isApproved ? 'approved' : 'rejected'}.`);
      await loadAllData();
    });
  }

  async function reviewQuestion(
    id: string,
    action: 'PUBLISH' | 'REQUEST_CHANGES',
  ) {
    await withBusy(async () => {
      await adminApiClient.post(`/admin/questions/${id}/review`, { action });
      setNotice(
        action === 'PUBLISH'
          ? 'Question published.'
          : 'Question moved back to draft.',
      );
      await loadAllData();
    });
  }

  async function updateSubject(id: number) {
    await withBusy(async () => {
      await adminApiClient.patch(`/admin/subjects/${id}`, subjectEditInput);
      setNotice('Subject updated.');
      setSubjectEditId(null);
      setSubjectEditInput({ name: '', icon: '', streamIds: [] });
      await loadAllData();
    });
  }

  async function updateTopic(id: number) {
    await withBusy(async () => {
      await adminApiClient.patch(`/admin/topics/${id}`, topicEditInput);
      setNotice('Topic updated.');
      setTopicEditId(null);
      setTopicEditInput({ name: '', subjectId: 0, gradeId: 0, sortOrder: 0 });
      await loadAllData();
    });
  }

  async function fetchUsers() {
    const response = await adminApiClient.get<AdminUsersResponse>(
      '/admin/users',
      {
        params: {
          search: userSearch.trim() || undefined,
          limit: 20,
          offset: 0,
        },
      },
    );
    setUsers(response.data.data);
    setUsersTotal(response.data.total);
    if (selectedUserId) {
      const stillExists = response.data.data.some(
        (user) => user.id === selectedUserId,
      );
      if (!stillExists) {
        setSelectedUserId(null);
        setSelectedUserDetail(null);
      }
    }
  }

  async function loadUsers() {
    await withBusy(async () => {
      await fetchUsers();
    });
  }

  async function fetchUserDetail(userId: string) {
    const response = await adminApiClient.get<AdminUserDetail>(
      `/admin/users/${userId}`,
    );
    setSelectedUserId(userId);
    setSelectedUserDetail(response.data);
  }

  async function loadUserDetail(userId: string) {
    await withBusy(async () => {
      await fetchUserDetail(userId);
    });
  }

  async function updateUserSubscription(action: 'ACTIVATE' | 'DEACTIVATE') {
    await withBusy(async () => {
      if (!selectedUserId) {
        setError('Select a user first.');
        return;
      }
      await adminApiClient.patch(
        `/admin/users/${selectedUserId}/subscription`,
        {
          action,
          ...(action === 'ACTIVATE' ? { plan: userSubscriptionPlan } : {}),
        },
      );
      setNotice(
        action === 'ACTIVATE'
          ? 'Subscription activated manually.'
          : 'Subscription deactivated.',
      );
      await Promise.all([fetchUsers(), fetchUserDetail(selectedUserId)]);
    });
  }

  if (isLoading) {
    return <div className="container">Loading admin dashboard...</div>;
  }

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
            <strong>Exam Prep Admin</strong>
            <div className="muted" style={{ fontSize: 12 }}>
              Content and payment management
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link className="btn" href="/analytics">
              Analytics
            </Link>
            <button className="btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <div className="tabs" style={{ marginBottom: 14 }}>
          {(
            [
              ['overview', 'Overview'],
              ['questions', 'Question Management'],
              ['subjects_topics', 'Subject/Topic Management'],
              ['mock_exams', 'Mock Exam Management'],
              ['payments', 'Payment Verification'],
              ['users', 'User Management'],
            ] as Array<[TabKey, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              className={`tab ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p className="error">{error}</p>}
        {notice && <p className="ok">{notice}</p>}

        {activeTab === 'overview' && (
          <section className="grid" style={{ gap: 14 }}>
            <div className="grid three">
              <div className="card">
                <div className="muted">Total Users</div>
                <h2>{overview?.totalUsers ?? 0}</h2>
              </div>
              <div className="card">
                <div className="muted">Active Subscribers</div>
                <h2>{overview?.activeSubscribers ?? 0}</h2>
              </div>
              <div className="card">
                <div className="muted">New Users (7 days)</div>
                <h2>{overview?.newUsersThisWeek ?? 0}</h2>
              </div>
            </div>
            <div className="grid three">
              <div className="card">
                <div className="muted">Total Questions</div>
                <h2>{overview?.totalQuestions ?? questionTotal}</h2>
              </div>
              <div className="card">
                <div className="muted">Pending Payments</div>
                <h2>{overview?.pendingPayments ?? pendingPayments.length}</h2>
              </div>
              <div className="card">
                <div className="muted">Mock Exams</div>
                <h2>{overview?.mockExams ?? mockExams.length}</h2>
              </div>
            </div>
            <div className="grid two">
              <div className="card">
                <div className="muted">Total Revenue (ETB)</div>
                <h2>{(overview?.totalRevenueEtb ?? 0).toLocaleString()}</h2>
              </div>
              <div className="card">
                <div className="muted">Revenue Last 30 Days (ETB)</div>
                <h2>
                  {(overview?.revenueLast30DaysEtb ?? 0).toLocaleString()}
                </h2>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'questions' && (
          <section className="grid" style={{ gap: 14 }}>
            <div className="card">
              <h3>Filters</h3>
              <div className="grid three">
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Subject
                  </div>
                  <select
                    className="select"
                    value={questionSubjectFilter}
                    onChange={(event) => {
                      setQuestionSubjectFilter(
                        event.target.value ? Number(event.target.value) : '',
                      );
                      setQuestionTopicFilter('');
                    }}
                  >
                    <option value="">All</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Grade
                  </div>
                  <select
                    className="select"
                    value={questionGradeFilter}
                    onChange={(event) => {
                      setQuestionGradeFilter(
                        event.target.value ? Number(event.target.value) : '',
                      );
                      setQuestionTopicFilter('');
                    }}
                  >
                    <option value="">All</option>
                    {grades.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        Grade {grade.gradeNumber}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Topic
                  </div>
                  <select
                    className="select"
                    value={questionTopicFilter}
                    onChange={(event) =>
                      setQuestionTopicFilter(
                        event.target.value ? Number(event.target.value) : '',
                      )
                    }
                  >
                    <option value="">All</option>
                    {questionFilterTopicOptions.map((topic) => (
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
                    value={questionDifficultyFilter}
                    onChange={(event) =>
                      setQuestionDifficultyFilter(
                        toDifficultyFilter(event.target.value),
                      )
                    }
                  >
                    <option value="ALL">All</option>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </label>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Status
                  </div>
                  <select
                    className="select"
                    value={questionStatusFilter}
                    onChange={(event) =>
                      setQuestionStatusFilter(
                        toQuestionStatusFilter(event.target.value),
                      )
                    }
                  >
                    <option value="ALL">All</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </label>
              </div>
              <div style={{ marginTop: 10 }}>
                <button className="btn" onClick={() => void loadAllData()}>
                  Apply Filters
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Create Question</h3>
              <div className="grid two">
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Question Text
                  </div>
                  <textarea
                    className="textarea"
                    value={createQuestionInput.questionText}
                    onChange={(event) =>
                      setCreateQuestionInput((previous) => ({
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
                    value={createQuestionInput.explanation}
                    onChange={(event) =>
                      setCreateQuestionInput((previous) => ({
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
                    Subject
                  </div>
                  <select
                    className="select"
                    value={createQuestionSubjectId}
                    onChange={(event) => {
                      const nextSubjectId = event.target.value
                        ? Number(event.target.value)
                        : '';
                      setCreateQuestionSubjectId(nextSubjectId);
                      setCreateQuestionInput((previous) => ({
                        ...previous,
                        topicId: 0,
                      }));
                    }}
                  >
                    <option value="">Select subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Grade
                  </div>
                  <select
                    className="select"
                    value={createQuestionInput.gradeId}
                    onChange={(event) =>
                      setCreateQuestionInput((previous) => ({
                        ...previous,
                        gradeId: Number(event.target.value),
                        topicId: 0,
                      }))
                    }
                  >
                    <option value={0}>Select grade</option>
                    {grades.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        Grade {grade.gradeNumber}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Topic (Chapter)
                  </div>
                  <select
                    className="select"
                    value={createQuestionInput.topicId}
                    disabled={
                      !createQuestionSubjectId || !createQuestionInput.gradeId
                    }
                    onChange={(event) =>
                      setCreateQuestionInput((previous) => ({
                        ...previous,
                        topicId: Number(event.target.value),
                      }))
                    }
                  >
                    <option value={0}>Select chapter</option>
                    {createQuestionTopicOptions.map((topic) => (
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
                    value={createQuestionInput.difficulty}
                    onChange={(event) =>
                      setCreateQuestionInput((previous) => ({
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
              </div>
              <div className="grid two" style={{ marginTop: 10 }}>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Option A
                  </div>
                  <input
                    className="input"
                    value={createQuestionInput.optionA}
                    onChange={(event) =>
                      setCreateQuestionInput((previous) => ({
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
                    value={createQuestionInput.optionB}
                    onChange={(event) =>
                      setCreateQuestionInput((previous) => ({
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
                    value={createQuestionInput.optionC}
                    onChange={(event) =>
                      setCreateQuestionInput((previous) => ({
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
                    value={createQuestionInput.optionD}
                    onChange={(event) =>
                      setCreateQuestionInput((previous) => ({
                        ...previous,
                        optionD: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="grid three" style={{ marginTop: 10 }}>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Correct Option
                  </div>
                  <select
                    className="select"
                    value={createQuestionInput.correctOption}
                    onChange={(event) =>
                      setCreateQuestionInput((previous) => ({
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
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Status
                  </div>
                  <select
                    className="select"
                    value={createQuestionInput.status}
                    onChange={(event) =>
                      setCreateQuestionInput((previous) => ({
                        ...previous,
                        status: toQuestionStatus(event.target.value),
                      }))
                    }
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </label>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Year (optional)
                  </div>
                  <input
                    className="input"
                    value={createQuestionInput.year}
                    onChange={(event) =>
                      setCreateQuestionInput((previous) => ({
                        ...previous,
                        year: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div style={{ marginTop: 10 }}>
                <button
                  className="btn primary"
                  disabled={isBusy}
                  onClick={() => void createQuestion()}
                >
                  Create Question
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Bulk Import CSV</h3>
              <input
                className="input"
                type="file"
                accept=".csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void bulkImportQuestions(file);
                }}
              />
            </div>

            <div className="card">
              <h3>Question List ({questions.length} shown)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Subject</th>
                      <th>Topic</th>
                      <th>Difficulty</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((question) => (
                      <tr key={question.id}>
                        <td>{question.questionText.slice(0, 90)}...</td>
                        <td>{question.topic.subject?.name ?? '-'}</td>
                        <td>{question.topic.name}</td>
                        <td>{question.difficulty}</td>
                        <td>{question.status}</td>
                        <td>
                          <button
                            className="btn"
                            onClick={() => {
                              setQuestionEditId(question.id);
                              setQuestionEditInput({
                                questionText: question.questionText,
                                explanation: question.explanation || '',
                                difficulty: question.difficulty,
                                status: question.status,
                              });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn"
                            style={{ marginLeft: 8 }}
                            onClick={() => void deleteQuestion(question.id)}
                          >
                            Delete
                          </button>
                          {question.status === 'DRAFT' && (
                            <>
                              <button
                                className="btn primary"
                                style={{ marginLeft: 8 }}
                                disabled={isBusy}
                                onClick={() =>
                                  void reviewQuestion(question.id, 'PUBLISH')
                                }
                              >
                                Publish
                              </button>
                              <button
                                className="btn"
                                style={{ marginLeft: 8 }}
                                disabled={isBusy}
                                onClick={() =>
                                  void reviewQuestion(
                                    question.id,
                                    'REQUEST_CHANGES',
                                  )
                                }
                              >
                                Request Changes
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3>Draft Review Queue ({draftQuestions.length})</h3>
              {draftQuestions.length === 0 ? (
                <p className="muted">No draft questions pending review.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Subject</th>
                      <th>Topic</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftQuestions.map((question) => (
                      <tr key={question.id}>
                        <td>{question.questionText.slice(0, 80)}...</td>
                        <td>{question.topic.subject?.name ?? '-'}</td>
                        <td>{question.topic.name}</td>
                        <td>
                          <button
                            className="btn primary"
                            disabled={isBusy}
                            onClick={() =>
                              void reviewQuestion(question.id, 'PUBLISH')
                            }
                          >
                            Publish
                          </button>
                          <button
                            className="btn"
                            disabled={isBusy}
                            style={{ marginLeft: 8 }}
                            onClick={() =>
                              void reviewQuestion(
                                question.id,
                                'REQUEST_CHANGES',
                              )
                            }
                          >
                            Request Changes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {questionEditId && (
              <div className="card">
                <h3>Edit Question</h3>
                <div className="grid two">
                  <label>
                    <div className="muted" style={{ marginBottom: 6 }}>
                      Question Text
                    </div>
                    <textarea
                      className="textarea"
                      value={questionEditInput.questionText}
                      onChange={(event) =>
                        setQuestionEditInput((previous) => ({
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
                      value={questionEditInput.explanation}
                      onChange={(event) =>
                        setQuestionEditInput((previous) => ({
                          ...previous,
                          explanation: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="grid two" style={{ marginTop: 10 }}>
                  <label>
                    <div className="muted" style={{ marginBottom: 6 }}>
                      Difficulty
                    </div>
                    <select
                      className="select"
                      value={questionEditInput.difficulty}
                      onChange={(event) =>
                        setQuestionEditInput((previous) => ({
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
                      Status
                    </div>
                    <select
                      className="select"
                      value={questionEditInput.status}
                      onChange={(event) =>
                        setQuestionEditInput((previous) => ({
                          ...previous,
                          status: toQuestionStatus(event.target.value),
                        }))
                      }
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </label>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button
                    className="btn primary"
                    disabled={isBusy}
                    onClick={() => void updateQuestion(questionEditId)}
                  >
                    Save
                  </button>
                  <button
                    className="btn"
                    onClick={() => setQuestionEditId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'subjects_topics' && (
          <section className="grid" style={{ gap: 14 }}>
            <div className="grid two">
              <div className="card">
                <h3>Create Subject</h3>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Name
                  </div>
                  <input
                    className="input"
                    value={createSubjectInput.name}
                    onChange={(event) =>
                      setCreateSubjectInput((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label style={{ marginTop: 10 }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Icon
                  </div>
                  <input
                    className="input"
                    value={createSubjectInput.icon}
                    onChange={(event) =>
                      setCreateSubjectInput((previous) => ({
                        ...previous,
                        icon: event.target.value,
                      }))
                    }
                  />
                </label>
                <label style={{ marginTop: 10 }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Streams
                  </div>
                  <select
                    className="select"
                    multiple
                    value={createSubjectInput.streamIds.map(String)}
                    onChange={(event) => {
                      const values = Array.from(
                        event.target.selectedOptions,
                      ).map((option) => Number(option.value));
                      setCreateSubjectInput((previous) => ({
                        ...previous,
                        streamIds: values,
                      }));
                    }}
                  >
                    {streams.map((stream) => (
                      <option key={stream.id} value={stream.id}>
                        {stream.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ marginTop: 10 }}>
                  <button
                    className="btn primary"
                    disabled={isBusy}
                    onClick={() => void createSubject()}
                  >
                    Create Subject
                  </button>
                </div>
              </div>

              <div className="card">
                <h3>Create Topic</h3>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Topic Name
                  </div>
                  <input
                    className="input"
                    value={createTopicInput.name}
                    onChange={(event) =>
                      setCreateTopicInput((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="grid two" style={{ marginTop: 10 }}>
                  <label>
                    <div className="muted" style={{ marginBottom: 6 }}>
                      Subject
                    </div>
                    <select
                      className="select"
                      value={createTopicInput.subjectId}
                      onChange={(event) =>
                        setCreateTopicInput((previous) => ({
                          ...previous,
                          subjectId: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={0}>Select subject</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <div className="muted" style={{ marginBottom: 6 }}>
                      Grade
                    </div>
                    <select
                      className="select"
                      value={createTopicInput.gradeId}
                      onChange={(event) =>
                        setCreateTopicInput((previous) => ({
                          ...previous,
                          gradeId: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={0}>Select grade</option>
                      {grades.map((grade) => (
                        <option key={grade.id} value={grade.id}>
                          Grade {grade.gradeNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label style={{ marginTop: 10 }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Sort Order
                  </div>
                  <input
                    className="input"
                    type="number"
                    value={createTopicInput.sortOrder}
                    onChange={(event) =>
                      setCreateTopicInput((previous) => ({
                        ...previous,
                        sortOrder: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <div style={{ marginTop: 10 }}>
                  <button
                    className="btn primary"
                    disabled={isBusy}
                    onClick={() => void createTopic()}
                  >
                    Create Topic
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Subjects</h3>
              <div className="grid two" style={{ marginBottom: 10 }}>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Filter by subject name
                  </div>
                  <input
                    className="input"
                    value={subjectNameFilter}
                    onChange={(event) => setSubjectNameFilter(event.target.value)}
                    placeholder="Search subjects..."
                  />
                </label>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setSubjectNameFilter('')}
                    disabled={!subjectNameFilter}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Streams</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdminSubjects.map((subject) => (
                    <tr key={subject.id}>
                      <td>{subject.name}</td>
                      <td>{subject.streamIds.join(', ')}</td>
                      <td>
                        <button
                          className="btn"
                          onClick={() => {
                            setSubjectEditId(subject.id);
                            setSubjectEditInput({
                              name: subject.name,
                              icon: subject.icon ?? '',
                              streamIds: subject.streamIds,
                            });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn"
                          style={{ marginLeft: 8 }}
                          onClick={() => void deleteSubject(subject.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {subjectEditId !== null && (
              <div className="card">
                <h3>Edit Subject</h3>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Name
                  </div>
                  <input
                    className="input"
                    value={subjectEditInput.name}
                    onChange={(event) =>
                      setSubjectEditInput((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label style={{ marginTop: 10 }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Icon
                  </div>
                  <input
                    className="input"
                    value={subjectEditInput.icon}
                    onChange={(event) =>
                      setSubjectEditInput((previous) => ({
                        ...previous,
                        icon: event.target.value,
                      }))
                    }
                  />
                </label>
                <label style={{ marginTop: 10 }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Streams
                  </div>
                  <select
                    className="select"
                    multiple
                    value={subjectEditInput.streamIds.map(String)}
                    onChange={(event) => {
                      const values = Array.from(
                        event.target.selectedOptions,
                      ).map((option) => Number(option.value));
                      setSubjectEditInput((previous) => ({
                        ...previous,
                        streamIds: values,
                      }));
                    }}
                  >
                    {streams.map((stream) => (
                      <option key={stream.id} value={stream.id}>
                        {stream.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button
                    className="btn primary"
                    disabled={isBusy}
                    onClick={() => void updateSubject(subjectEditId)}
                  >
                    Save
                  </button>
                  <button
                    className="btn"
                    onClick={() => setSubjectEditId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="card">
              <h3>Topics</h3>
              <div className="grid three" style={{ marginBottom: 10 }}>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Filter by topic name
                  </div>
                  <input
                    className="input"
                    value={topicNameFilter}
                    onChange={(event) => setTopicNameFilter(event.target.value)}
                    placeholder="Search topics..."
                  />
                </label>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Filter by subject
                  </div>
                  <select
                    className="select"
                    value={topicSubjectFilter}
                    onChange={(event) =>
                      setTopicSubjectFilter(
                        event.target.value ? Number(event.target.value) : '',
                      )
                    }
                  >
                    <option value="">All subjects</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Filter by grade
                  </div>
                  <select
                    className="select"
                    value={topicGradeFilter}
                    onChange={(event) =>
                      setTopicGradeFilter(
                        event.target.value ? Number(event.target.value) : '',
                      )
                    }
                  >
                    <option value="">All grades</option>
                    {grades.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        Grade {grade.gradeNumber}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{ marginBottom: 10 }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setTopicNameFilter('');
                    setTopicSubjectFilter('');
                    setTopicGradeFilter('');
                  }}
                  disabled={
                    !topicNameFilter && !topicSubjectFilter && !topicGradeFilter
                  }
                >
                  Clear topic filters
                </button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Subject</th>
                    <th>Grade</th>
                    <th>Sort</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTopics.map((topic) => (
                    <tr key={topic.id}>
                      <td>{topic.name}</td>
                      <td>{topic.subject?.name}</td>
                      <td>{topic.grade?.gradeNumber}</td>
                      <td>{topic.sortOrder}</td>
                      <td>
                        <button
                          className="btn"
                          onClick={() => {
                            setTopicEditId(topic.id);
                            setTopicEditInput({
                              name: topic.name,
                              subjectId: topic.subjectId,
                              gradeId: topic.gradeId,
                              sortOrder: topic.sortOrder,
                            });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn"
                          style={{ marginLeft: 8 }}
                          onClick={() => void deleteTopic(topic.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {topicEditId !== null && (
              <div className="card">
                <h3>Edit Topic</h3>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Topic Name
                  </div>
                  <input
                    className="input"
                    value={topicEditInput.name}
                    onChange={(event) =>
                      setTopicEditInput((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="grid two" style={{ marginTop: 10 }}>
                  <label>
                    <div className="muted" style={{ marginBottom: 6 }}>
                      Subject
                    </div>
                    <select
                      className="select"
                      value={topicEditInput.subjectId}
                      onChange={(event) =>
                        setTopicEditInput((previous) => ({
                          ...previous,
                          subjectId: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={0}>Select subject</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <div className="muted" style={{ marginBottom: 6 }}>
                      Grade
                    </div>
                    <select
                      className="select"
                      value={topicEditInput.gradeId}
                      onChange={(event) =>
                        setTopicEditInput((previous) => ({
                          ...previous,
                          gradeId: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={0}>Select grade</option>
                      {grades.map((grade) => (
                        <option key={grade.id} value={grade.id}>
                          Grade {grade.gradeNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label style={{ marginTop: 10 }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Sort Order
                  </div>
                  <input
                    className="input"
                    type="number"
                    value={topicEditInput.sortOrder}
                    onChange={(event) =>
                      setTopicEditInput((previous) => ({
                        ...previous,
                        sortOrder: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button
                    className="btn primary"
                    disabled={isBusy}
                    onClick={() => void updateTopic(topicEditId)}
                  >
                    Save
                  </button>
                  <button className="btn" onClick={() => setTopicEditId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'mock_exams' && (
          <section className="grid" style={{ gap: 14 }}>
            <div className="card">
              <h3>Create Mock Exam</h3>
              <div className="grid two">
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Title
                  </div>
                  <input
                    className="input"
                    value={createMockExamInput.title}
                    onChange={(event) =>
                      setCreateMockExamInput((previous) => ({
                        ...previous,
                        title: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Duration (minutes)
                  </div>
                  <input
                    className="input"
                    type="number"
                    value={createMockExamInput.durationMinutes}
                    onChange={(event) =>
                      setCreateMockExamInput((previous) => ({
                        ...previous,
                        durationMinutes: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Subject
                  </div>
                  <select
                    className="select"
                    value={createMockExamInput.subjectId}
                    onChange={(event) =>
                      setCreateMockExamInput((previous) => ({
                        ...previous,
                        subjectId: Number(event.target.value),
                      }))
                    }
                  >
                    <option value={0}>Select subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Grade
                  </div>
                  <select
                    className="select"
                    value={createMockExamInput.gradeId}
                    onChange={(event) =>
                      setCreateMockExamInput((previous) => ({
                        ...previous,
                        gradeId: Number(event.target.value),
                      }))
                    }
                  >
                    <option value={0}>Select grade</option>
                    {grades.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        Grade {grade.gradeNumber}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label style={{ marginTop: 10 }}>
                <div className="muted" style={{ marginBottom: 6 }}>
                  Question Count
                </div>
                <input
                  className="input"
                  type="number"
                  value={createMockExamInput.questionCount}
                  onChange={(event) =>
                    setCreateMockExamInput((previous) => ({
                      ...previous,
                      questionCount: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <div style={{ marginTop: 10 }}>
                <button
                  className="btn primary"
                  disabled={isBusy}
                  onClick={() => void createMockExam()}
                >
                  Create Mock Exam & Add Questions
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Mock Exams</h3>
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Grade</th>
                    <th>Duration</th>
                    <th>Questions</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mockExams.map((exam) => (
                    <tr key={exam.id}>
                      <td>{exam.title}</td>
                      <td>{exam.subject.name}</td>
                      <td>{exam.grade.gradeNumber}</td>
                      <td>{exam.durationMinutes}</td>
                      <td>{exam.questionCount}</td>
                      <td>
                        <button
                          className="btn"
                          style={{ marginRight: 8 }}
                          onClick={() =>
                            router.push(`/mock-exams/${exam.id}/questions`)
                          }
                        >
                          Manage Questions
                        </button>
                        <button
                          className="btn"
                          onClick={() => {
                            setMockExamEditId(exam.id);
                            setMockExamEditInput({
                              title: exam.title,
                              durationMinutes: exam.durationMinutes,
                            });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn"
                          style={{ marginLeft: 8 }}
                          onClick={() => void deleteMockExam(exam.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {mockExamEditId && (
              <div className="card">
                <h3>Edit Mock Exam</h3>
                <div className="grid two">
                  <label>
                    <div className="muted" style={{ marginBottom: 6 }}>
                      Title
                    </div>
                    <input
                      className="input"
                      value={mockExamEditInput.title}
                      onChange={(event) =>
                        setMockExamEditInput((previous) => ({
                          ...previous,
                          title: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <div className="muted" style={{ marginBottom: 6 }}>
                      Duration
                    </div>
                    <input
                      className="input"
                      type="number"
                      value={mockExamEditInput.durationMinutes}
                      onChange={(event) =>
                        setMockExamEditInput((previous) => ({
                          ...previous,
                          durationMinutes: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button
                    className="btn primary"
                    disabled={isBusy}
                    onClick={() => void updateMockExam(mockExamEditId)}
                  >
                    Save
                  </button>
                  <button
                    className="btn"
                    onClick={() => setMockExamEditId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'payments' && (
          <section className="card">
            <h3>Pending Bank Transfer Verifications</h3>
            {pendingPayments.length === 0 ? (
              <p className="muted">No pending payments.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.user.name}</td>
                      <td>{payment.user.email}</td>
                      <td>{payment.subscription.plan}</td>
                      <td>{payment.method}</td>
                      <td>
                        {payment.amount} {payment.currency}
                      </td>
                      <td>{new Date(payment.createdAt).toLocaleString()}</td>
                      <td>
                        <button
                          className="btn primary"
                          disabled={isBusy}
                          onClick={() => void verifyPayment(payment.id, true)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn"
                          disabled={isBusy}
                          style={{ marginLeft: 8 }}
                          onClick={() => void verifyPayment(payment.id, false)}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeTab === 'users' && (
          <section className="grid" style={{ gap: 14 }}>
            <div className="card">
              <h3>User Search</h3>
              <div className="grid two">
                <label>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Search by name, email, or phone
                  </div>
                  <input
                    className="input"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="e.g. samuel, user@email.com, 0911..."
                  />
                </label>
                <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
                  <button
                    className="btn primary"
                    onClick={() => void loadUsers()}
                  >
                    Search
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setUserSearch('');
                      void withBusy(async () => {
                        const response =
                          await adminApiClient.get<AdminUsersResponse>(
                            '/admin/users',
                            { params: { limit: 20, offset: 0 } },
                          );
                        setUsers(response.data.data);
                        setUsersTotal(response.data.total);
                      });
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
              <p className="muted" style={{ marginTop: 8 }}>
                {usersTotal} user(s) found
              </p>
            </div>

            <div className="card">
              <h3>User List</h3>
              {users.length === 0 ? (
                <p className="muted">No users found.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Active Sub</th>
                      <th>Attempts</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>
                          {user.activeSubscription
                            ? `${user.activeSubscription.plan} (until ${new Date(
                                user.activeSubscription.expiresAt,
                              ).toLocaleDateString()})`
                            : 'None'}
                        </td>
                        <td>
                          Q: {user.counts.questionAttempts} | M:{' '}
                          {user.counts.mockExamAttempts}
                        </td>
                        <td>
                          <button
                            className="btn"
                            onClick={() => void loadUserDetail(user.id)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {selectedUserDetail && (
              <div className="card">
                <h3>User Detail</h3>
                <div className="grid three">
                  <div>
                    <div className="muted">Name</div>
                    <strong>{selectedUserDetail.name}</strong>
                  </div>
                  <div>
                    <div className="muted">Email</div>
                    <strong>{selectedUserDetail.email}</strong>
                  </div>
                  <div>
                    <div className="muted">Phone</div>
                    <strong>{selectedUserDetail.phone}</strong>
                  </div>
                </div>

                <div className="grid three" style={{ marginTop: 12 }}>
                  <label>
                    <div className="muted" style={{ marginBottom: 6 }}>
                      Activation plan
                    </div>
                    <select
                      className="select"
                      value={userSubscriptionPlan}
                      onChange={(event) =>
                        setUserSubscriptionPlan(
                          event.target.value as
                            | 'MONTHLY'
                            | 'QUARTERLY'
                            | 'YEARLY',
                        )
                      }
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
                    <button
                      className="btn primary"
                      disabled={isBusy}
                      onClick={() => void updateUserSubscription('ACTIVATE')}
                    >
                      Activate Subscription
                    </button>
                    <button
                      className="btn"
                      disabled={isBusy}
                      onClick={() => void updateUserSubscription('DEACTIVATE')}
                    >
                      Deactivate Subscription
                    </button>
                  </div>
                </div>

                <div className="grid two" style={{ marginTop: 14 }}>
                  <div>
                    <h4 style={{ marginBottom: 8 }}>Recent Subscriptions</h4>
                    {selectedUserDetail.subscriptions.length === 0 ? (
                      <p className="muted">No subscriptions.</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Plan</th>
                            <th>Status</th>
                            <th>Expires</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedUserDetail.subscriptions.map(
                            (subscription) => (
                              <tr key={subscription.id}>
                                <td>{subscription.plan}</td>
                                <td>{subscription.status}</td>
                                <td>
                                  {new Date(
                                    subscription.expiresAt,
                                  ).toLocaleDateString()}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div>
                    <h4 style={{ marginBottom: 8 }}>Recent Payments</h4>
                    {selectedUserDetail.payments.length === 0 ? (
                      <p className="muted">No payments.</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedUserDetail.payments.map((payment) => (
                            <tr key={payment.id}>
                              <td>
                                {payment.amount} {payment.currency}
                              </td>
                              <td>{payment.method}</td>
                              <td>{payment.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
