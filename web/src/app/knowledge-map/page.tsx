'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/authStore';
import { BreadcrumbTrail, Skeleton } from '@/components/ui';
import { useKnowledgeMapData } from '@/components/KnowledgeMap/useKnowledgeMapData';

const KnowledgeMapCanvas = dynamic(
  () => import('@/components/KnowledgeMap/KnowledgeMapCanvas'),
  { loading: () => <Skeleton className="h-full w-full" />, ssr: false },
);

// ── Loading splash ─────────────────────────────────────────────────────

const SPLASH_MESSAGES = [
  'Doing a deep dive into your mind...',
  'Mapping your knowledge...',
  'Discovering your strengths...',
  'Charting your progress...',
] as const;

const MIN_SPLASH_MS = 2500;

function LoadingSplash({ message, progress }: { message: string; progress: number }) {
  return (
    <div className="emerald-preview flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="flex w-full max-w-md flex-col items-center gap-6 px-6">
        {/* Pulsing concentric rings */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent-color)]/10" />
          <span className="absolute inset-2 animate-pulse rounded-full bg-[var(--accent-color)]/15" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-color)]/20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-8 w-8 text-[var(--accent-color)]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
              />
            </svg>
          </span>
        </div>

        <p className="text-center text-sm font-medium text-[var(--foreground)]/70">
          {message}
        </p>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
          <div
            className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default function KnowledgeMapPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { t } = useI18n();
  const { nodes, links, isLoading: dataLoading } = useKnowledgeMapData();

  const [splashDone, setSplashDone] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Minimum splash timer
  useEffect(() => {
    const id = window.setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => window.clearTimeout(id);
  }, []);

  // Rotate messages
  useEffect(() => {
    if (splashDone && !dataLoading) return;
    const id = window.setInterval(
      () => setMsgIndex((p) => (p + 1) % SPLASH_MESSAGES.length),
      1600,
    );
    return () => window.clearInterval(id);
  }, [splashDone, dataLoading]);

  // Fake progress bar
  useEffect(() => {
    if (!dataLoading) {
      setProgress(100);
      return;
    }
    const id = window.setInterval(
      () => setProgress((p) => (p >= 90 ? 30 : p + 12)),
      600,
    );
    return () => window.clearInterval(id);
  }, [dataLoading]);

  const showSplash = dataLoading || !splashDone;

  if (showSplash) {
    return (
      <LoadingSplash
        message={SPLASH_MESSAGES[msgIndex % SPLASH_MESSAGES.length]!}
        progress={progress}
      />
    );
  }

  return (
    <div className="emerald-preview flex h-screen flex-col overflow-hidden bg-[var(--background)]">
      <header className="edu-topbar sticky top-0 z-30 border-b backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/35 bg-white/15 shadow-md shadow-[rgba(15,23,42,0.16)]">
              <span className="text-base font-bold text-white">e</span>
            </div>
            <span className="text-base font-semibold text-white">examprep</span>
          </Link>
          <button
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-amber-50 transition-colors hover:text-white"
          >
            {t('common.logOut', 'Log out')}
          </button>
        </nav>
      </header>

      <div className="px-6 pt-4">
        <BreadcrumbTrail
          items={[
            { label: t('common.dashboard', 'Dashboard'), href: '/dashboard' },
            { label: 'Knowledge Map' },
          ]}
        />
      </div>

      {/* Canvas fills remaining height */}
      <div className="relative min-h-0 flex-1">
        {nodes.length > 0 ? (
          <KnowledgeMapCanvas nodes={nodes} links={links} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--foreground)]/50">
            No subjects found. Add subjects and practice questions to see your knowledge map.
          </div>
        )}
      </div>
    </div>
  );
}
