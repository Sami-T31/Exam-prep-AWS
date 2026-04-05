const SUBJECT_COLOR_MAP: Array<[string, string]> = [
  ['mathematics', '#c49a6c'],
  ['math', '#c49a6c'],
  ['physics', '#6c8aa6'],
  ['chemistry', '#bf7a61'],
  ['biology', '#7f9d69'],
  ['english', '#9371ab'],
  ['history', '#a36f52'],
  ['geography', '#5f8d81'],
  ['civics', '#8c6b8f'],
  ['economics', '#6f7eb1'],
  ['ict', '#5f86a8'],
  ['computer', '#5f86a8'],
  ['aptitude', '#7c8f66'],
] as const;

const FALLBACK_SUBJECT_COLORS = [
  '#c49a6c',
  '#6c8aa6',
  '#7f9d69',
  '#bf7a61',
  '#9371ab',
  '#5f8d81',
] as const;

function normalizeSubjectName(subjectName: string) {
  return subjectName.trim().toLowerCase();
}

export function getSubjectColor(subjectName: string) {
  const normalized = normalizeSubjectName(subjectName);
  const directMatch = SUBJECT_COLOR_MAP.find(([key]) =>
    normalized.includes(key),
  );

  if (directMatch) {
    return directMatch[1];
  }

  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = normalized.charCodeAt(index) + ((hash << 5) - hash);
  }

  const fallbackIndex = Math.abs(hash) % FALLBACK_SUBJECT_COLORS.length;
  return FALLBACK_SUBJECT_COLORS[fallbackIndex];
}
