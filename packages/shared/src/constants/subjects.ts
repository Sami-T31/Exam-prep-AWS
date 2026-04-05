import { Stream } from './enums';

/**
 * Defines which subjects belong to which academic stream.
 * This mirrors the Ethiopian Ministry of Education curriculum structure.
 *
 * Shared subjects (both streams): Mathematics, English, Amharic, Civics
 * Natural Science only: Physics, Chemistry, Biology
 * Social Science only: Economics, Geography, History
 * Aptitude: a cross-stream exam component
 */
export const SUBJECT_STREAM_MAP: Record<string, Stream[]> = {
  Mathematics: [Stream.NATURAL_SCIENCE, Stream.SOCIAL_SCIENCE],
  English: [Stream.NATURAL_SCIENCE, Stream.SOCIAL_SCIENCE],
  Amharic: [Stream.NATURAL_SCIENCE, Stream.SOCIAL_SCIENCE],
  Civics: [Stream.NATURAL_SCIENCE, Stream.SOCIAL_SCIENCE],
  Physics: [Stream.NATURAL_SCIENCE],
  Chemistry: [Stream.NATURAL_SCIENCE],
  Biology: [Stream.NATURAL_SCIENCE],
  Economics: [Stream.SOCIAL_SCIENCE],
  Geography: [Stream.SOCIAL_SCIENCE],
  History: [Stream.SOCIAL_SCIENCE],
  Aptitude: [Stream.NATURAL_SCIENCE, Stream.SOCIAL_SCIENCE],
};

/**
 * List of all subjects available in the app.
 */
export const ALL_SUBJECTS = Object.keys(SUBJECT_STREAM_MAP);

/**
 * The 4 standard option labels used in Ethiopian national exams.
 */
export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

/**
 * Free tier limits: how many questions a non-subscriber can
 * access per subject. Adjust this value to control the
 * free-to-paid conversion funnel.
 */
export const FREE_TIER_QUESTIONS_PER_SUBJECT = 10;

/**
 * How many days a subscription remains valid offline
 * before the app requires an internet connection to re-verify.
 */
export const OFFLINE_GRACE_PERIOD_DAYS = 3;
