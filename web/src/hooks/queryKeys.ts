export const queryKeys = {
  subjects: {
    all: ['subjects'] as const,
    detail: (id: number) => ['subjects', id] as const,
  },
  streams: {
    all: ['streams'] as const,
  },
  grades: {
    all: ['grades'] as const,
  },
  stats: {
    overall: ['stats', 'overall'] as const,
    subjects: ['stats', 'subjects'] as const,
    subjectDetail: (subjectId: number) => ['stats', 'subjects', subjectId] as const,
    weakTopics: (threshold: number, minAttempts: number) =>
      ['stats', 'weak-topics', threshold, minAttempts] as const,
    trend: (days: number) => ['stats', 'trend', days] as const,
    grades: ['stats', 'grades'] as const,
    gradeDetail: (gradeId: number) => ['stats', 'grades', gradeId] as const,
  },
  bookmarks: {
    list: (subjectId?: number, gradeId?: number) =>
      ['bookmarks', { subjectId, gradeId }] as const,
  },
  leaderboard: {
    list: (period: string, subjectId: number | null, limit: number) =>
      ['leaderboard', period, subjectId, limit] as const,
  },
  mockExams: {
    list: (subjectId?: number, gradeId?: number) =>
      ['mock-exams', { subjectId, gradeId }] as const,
    attempts: ['mock-exams', 'attempts'] as const,
  },
  subscriptions: {
    plans: ['subscriptions', 'plans'] as const,
    status: ['subscriptions', 'status'] as const,
  },
  payments: {
    history: ['payments', 'history'] as const,
  },
  consent: {
    current: ['consent'] as const,
  },
} as const;


