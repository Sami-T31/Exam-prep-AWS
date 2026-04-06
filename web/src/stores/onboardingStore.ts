import { create } from 'zustand';

interface OnboardingProfile {
  hasCompletedOnboarding: boolean;
  grade: number | null;
  prioritySubjects: string[];
  dailyGoal: number;
}

interface OnboardingState extends OnboardingProfile {
  /** true once the store has loaded from localStorage for the current user */
  _ready: boolean;
  _userId: string | null;

  hydrate: (userId: string) => void;
  setGrade: (grade: number) => void;
  setPrioritySubjects: (subjects: string[]) => void;
  setDailyGoal: (goal: number) => void;
  completeOnboarding: () => void;
  applyDefaults: () => void;
}

const DEFAULTS: OnboardingProfile = {
  hasCompletedOnboarding: false,
  grade: null,
  prioritySubjects: [],
  dailyGoal: 20,
};

function storageKey(userId: string) {
  return `examprep_onboarding_${userId}`;
}

function readProfile(userId: string): OnboardingProfile {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return JSON.parse(raw) as OnboardingProfile;
  } catch { /* corrupt data */ }
  return { ...DEFAULTS };
}

function persistProfile(userId: string | null, profile: OnboardingProfile) {
  if (!userId) return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(profile));
  } catch { /* storage full — non-critical */ }
}

function snapshot(state: OnboardingState): OnboardingProfile {
  return {
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    grade: state.grade,
    prioritySubjects: state.prioritySubjects,
    dailyGoal: state.dailyGoal,
  };
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...DEFAULTS,
  _ready: false,
  _userId: null,

  hydrate: (userId) => {
    if (get()._userId === userId) return;
    const profile = readProfile(userId);
    set({ ...profile, _ready: true, _userId: userId });
  },

  setGrade: (grade) => {
    set({ grade });
    const s = get();
    persistProfile(s._userId, { ...snapshot(s), grade });
  },

  setPrioritySubjects: (subjects) => {
    set({ prioritySubjects: subjects });
    const s = get();
    persistProfile(s._userId, { ...snapshot(s), prioritySubjects: subjects });
  },

  setDailyGoal: (goal) => {
    set({ dailyGoal: goal });
    const s = get();
    persistProfile(s._userId, { ...snapshot(s), dailyGoal: goal });
  },

  completeOnboarding: () => {
    set({ hasCompletedOnboarding: true });
    const s = get();
    persistProfile(s._userId, { ...snapshot(s), hasCompletedOnboarding: true });
  },

  applyDefaults: () => {
    const defaults: OnboardingProfile = {
      hasCompletedOnboarding: true,
      grade: 12,
      prioritySubjects: ['Mathematics', 'English', 'Aptitude'],
      dailyGoal: 20,
    };
    set(defaults);
    persistProfile(get()._userId, defaults);
  },
}));
