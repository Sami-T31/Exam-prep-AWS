'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { useSubjects, useBookmarks, useRemoveBookmark } from '@/hooks';
import { apiClient } from '@/lib/apiClient';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import {
  BreadcrumbTrail,
  Button,
  Card,
  DropdownOption,
  DropdownSelect,
  EmptyState,
  Skeleton,
} from '@/components/ui';

interface Grade {
  id: number;
  gradeNumber: number;
}

export default function BookmarksPage() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
  const [selectedGradeId, setSelectedGradeId] = useState<number | undefined>(undefined);

  const { data: subjects = [] } = useSubjects();
  const { data: grades = [] } = useQuery({
    queryKey: queryKeys.grades.all,
    queryFn: async () => {
      const { data } = await apiClient.get<Grade[]>('/grades');
      return data;
    },
  });
  const { data: bookmarks = [], isLoading, error: queryError, refetch } = useBookmarks(selectedSubjectId, selectedGradeId);
  const removeBookmarkMutation = useRemoveBookmark();

  const error = queryError ? 'Unable to load bookmarks. Please retry.' : '';

  async function removeBookmark(bookmarkId: string) {
    try {
      await removeBookmarkMutation.mutateAsync(bookmarkId);
      toast.success('Bookmark removed.');
    } catch {
      toast.error('Unable to remove bookmark.');
    }
  }

  const practiceHref = `/practice?bookmarked=1${selectedSubjectId ? `&subjectId=${selectedSubjectId}` : ''}${selectedGradeId ? `&gradeId=${selectedGradeId}` : ''}&difficulty=ALL`;
  const subjectOptions = useMemo<DropdownOption[]>(
    () => [
      { value: '', label: 'All subjects' },
      ...subjects.map((subject) => ({
        value: String(subject.id),
        label: subject.name,
      })),
    ],
    [subjects],
  );
  const gradeOptions = useMemo<DropdownOption[]>(
    () => [
      { value: '', label: 'All grades' },
      ...grades.map((grade) => ({
        value: String(grade.id),
        label: `Grade ${grade.gradeNumber}`,
      })),
    ],
    [grades],
  );
  const selectedSubjectLabel =
    subjects.find((subject) => subject.id === selectedSubjectId)?.name ??
    'All subjects';
  const selectedGradeNumber = grades.find(
    (grade) => grade.id === selectedGradeId,
  )?.gradeNumber;
  const selectedGradeLabel =
    selectedGradeNumber != null ? `Grade ${selectedGradeNumber}` : 'All grades';

  return (
    <div className="min-h-screen bg-[var(--background)] page-gradient">
      <header className="sticky top-0 z-30 border-b border-[var(--border-color)] bg-[var(--background)]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl">
              <span className="text-base font-bold text-white">e</span>
            </div>
            <span className="text-base font-semibold text-[var(--foreground)]">examprep</span>
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
            { label: 'Bookmarks' },
          ]}
        />

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Bookmarks</h1>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">
              Review saved questions and launch a bookmarked-only practice session.
            </p>
          </div>
          <Link
            href={practiceHref}
            className="brand-action inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition-all"
          >
            Practice Bookmarked
          </Link>
        </div>

        <Card
          className="ui-dropdown-panel relative z-20 mb-5 overflow-visible"
          padding="lg"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--foreground)]/70">
              <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1">
                {selectedSubjectLabel}
              </span>
              <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1">
                {selectedGradeLabel}
              </span>
              <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1 font-semibold text-[var(--accent-strong)]">
                {bookmarks.length} saved
              </span>
            </div>
            {(selectedSubjectId || selectedGradeId) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSubjectId(undefined);
                  setSelectedGradeId(undefined);
                }}
                className="ui-pill rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]/80"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DropdownSelect
              label="Subject"
              value={selectedSubjectId ? String(selectedSubjectId) : ''}
              options={subjectOptions}
              onChange={(nextValue) =>
                setSelectedSubjectId(nextValue ? Number(nextValue) : undefined)
              }
            />
            <DropdownSelect
              label="Grade"
              value={selectedGradeId ? String(selectedGradeId) : ''}
              options={gradeOptions}
              onChange={(nextValue) =>
                setSelectedGradeId(nextValue ? Number(nextValue) : undefined)
              }
            />
          </div>
        </Card>

        {error && (
          <Card className="mb-6 border-red-200/70 bg-red-50/60">
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
              Retry
            </Button>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : bookmarks.length === 0 ? (
          <EmptyState
            title="No bookmarks found"
            description="Save questions during practice to review them here."
            action={
              <Link
                href="/subjects"
                className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
              >
                Go to subjects
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {bookmarks.map((bookmark) => (
              <Card key={bookmark.id} padding="lg">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-semibold leading-relaxed text-[var(--foreground)]">{bookmark.question.questionText}</p>
                    <p className="mt-1 text-sm text-[var(--foreground)]/75">
                      {bookmark.question.topic.subject.name} - {bookmark.question.topic.name} - Grade {bookmark.question.grade.gradeNumber}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void removeBookmark(bookmark.id)}
                    isLoading={removeBookmarkMutation.isPending && removeBookmarkMutation.variables === bookmark.id}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}






