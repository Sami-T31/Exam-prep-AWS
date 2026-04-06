import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useSubjects, queryKeys } from '@/hooks';

// ── Public types consumed by the canvas ────────────────────────────────

export interface MapNode {
  id: string;
  label: string;
  depth: number; // 0 = root, 1 = grade, 2 = subject
  parentId: string | null;
  childIds: string[];
  /** Chapter-based coverage: coveredChapters / totalChapters × 100 */
  coverage: number;
  totalChapters: number;
  coveredChapters: number;
  /** Hex color assigned to this node. */
  color: string;
  /** Navigation target on click (only for leaf-level subjects). */
  href: string | null;
}

export interface MapLink {
  sourceId: string;
  targetId: string;
}

export interface KnowledgeMapData {
  nodes: MapNode[];
  links: MapLink[];
  isLoading: boolean;
}

// ── Types matching the API response shapes ─────────────────────────────

interface Grade {
  id: number;
  gradeNumber: number;
}

interface SubjectTopicStat {
  topicId: number;
  topicName: string;
  gradeId: number;
  gradeNumber: number;
  totalQuestions: number;
  attemptedQuestions: number;
  coverage: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
}

// ── Palettes ────────────────────────────────────────────────────────────

const GRADE_HUES = ['#7ca3d4', '#6cbfa0', '#c49a6c', '#b07aaf'];

const SUBJECT_HUES = [
  '#c49a6c', '#6c8aa6', '#7f9d69', '#bf7a61',
  '#9371ab', '#5f8d81', '#8c6b8f', '#6f7eb1',
  '#5f86a8', '#7c8f66', '#d0a97c', '#a36f52',
];

// ── Hook ───────────────────────────────────────────────────────────────

export function useKnowledgeMapData(): KnowledgeMapData {
  const { data: grades = [], isLoading: gradesLoading } = useQuery({
    queryKey: queryKeys.grades.all,
    queryFn: async () => {
      const { data } = await apiClient.get<Grade[]>('/grades');
      return data;
    },
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects();

  const topicQueries = useQueries({
    queries: subjects.map((s) => ({
      queryKey: queryKeys.stats.subjectDetail(s.id),
      queryFn: async () => {
        const { data } = await apiClient.get<SubjectTopicStat[]>(
          `/users/me/stats/subjects/${s.id}`,
        );
        return data;
      },
      enabled: subjects.length > 0,
      staleTime: 60_000,
    })),
  });

  const topicsLoading = topicQueries.some((q) => q.isLoading);
  const isLoading = gradesLoading || subjectsLoading || topicsLoading;

  const { nodes, links } = useMemo(() => {
    if (grades.length === 0 || subjects.length === 0) {
      return { nodes: [] as MapNode[], links: [] as MapLink[] };
    }

    // Collect every topic with its parent subject info
    type TopicRow = SubjectTopicStat & { subjectId: number; subjectName: string };
    const allTopics: TopicRow[] = [];
    subjects.forEach((subject, si) => {
      const topics: SubjectTopicStat[] = topicQueries[si]?.data ?? [];
      topics.forEach((t) => allTopics.push({ ...t, subjectId: subject.id, subjectName: subject.name }));
    });

    // Index topics by grade and by grade+subject
    const topicsByGrade = new Map<number, TopicRow[]>();
    const topicsByGradeSubject = new Map<string, TopicRow[]>();
    for (const t of allTopics) {
      if (!topicsByGrade.has(t.gradeId)) topicsByGrade.set(t.gradeId, []);
      topicsByGrade.get(t.gradeId)!.push(t);
      const gsKey = `${t.gradeId}:${t.subjectId}`;
      if (!topicsByGradeSubject.has(gsKey)) topicsByGradeSubject.set(gsKey, []);
      topicsByGradeSubject.get(gsKey)!.push(t);
    }

    function chapterCov(topics: TopicRow[]) {
      const total = topics.length;
      const covered = topics.filter((t) => t.attemptedQuestions > 0).length;
      return { totalChapters: total, coveredChapters: covered, coverage: total > 0 ? Math.round((covered / total) * 100) : 0 };
    }

    const allNodes: MapNode[] = [];
    const allLinks: MapLink[] = [];

    // Root
    const rootCov = chapterCov(allTopics);
    const root: MapNode = {
      id: 'root',
      label: 'My Learning',
      depth: 0,
      parentId: null,
      childIds: [],
      ...rootCov,
      color: '#8aafff',
      href: null,
    };
    allNodes.push(root);

    // Grades
    for (let gi = 0; gi < grades.length; gi++) {
      const grade = grades[gi]!;
      const gId = `grade-${grade.id}`;
      const gradeTopics = topicsByGrade.get(grade.id) ?? [];
      const gCov = chapterCov(gradeTopics);

      const gNode: MapNode = {
        id: gId,
        label: `Grade ${grade.gradeNumber}`,
        depth: 1,
        parentId: 'root',
        childIds: [],
        ...gCov,
        color: GRADE_HUES[gi % GRADE_HUES.length]!,
        href: null,
      };
      allNodes.push(gNode);
      root.childIds.push(gId);
      allLinks.push({ sourceId: 'root', targetId: gId });

      // Subjects within this grade
      const subjectsInGrade = new Map<number, TopicRow[]>();
      for (const t of gradeTopics) {
        if (!subjectsInGrade.has(t.subjectId)) subjectsInGrade.set(t.subjectId, []);
        subjectsInGrade.get(t.subjectId)!.push(t);
      }

      let sIdx = 0;
      for (const [subjectId, subjectTopics] of subjectsInGrade) {
        const sId = `subject-${subjectId}-grade-${grade.id}`;
        const sCov = chapterCov(subjectTopics);
        const subjectName = subjectTopics[0]?.subjectName ?? 'Unknown';

        const sNode: MapNode = {
          id: sId,
          label: subjectName,
          depth: 2,
          parentId: gId,
          childIds: [],
          ...sCov,
          color: SUBJECT_HUES[sIdx % SUBJECT_HUES.length]!,
          href: `/subjects/${subjectId}/topics`,
        };
        allNodes.push(sNode);
        gNode.childIds.push(sId);
        allLinks.push({ sourceId: gId, targetId: sId });
        sIdx++;
      }
    }

    return { nodes: allNodes, links: allLinks };
  }, [grades, subjects, topicQueries]);

  return { nodes, links, isLoading };
}
