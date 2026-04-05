import Link from 'next/link';
import { Card } from '@/components/ui';
import { CardSwap, SwapCard } from '@/components/visual/CardSwap';
import { LandingDotGrid } from '@/components/visual/LandingDotGrid';

const heroPills = ['Practice Questions', 'Mock Exams', 'Progress Tracking'];

const featureCards = [
  {
    eyebrow: 'Subject paths',
    title: 'Targeted practice by subject and grade',
    body: 'Move through the exact subjects, grades, and topics that need work instead of studying everything at once.',
    metric: 'Grades 9-12',
    note: 'Switch subjects without losing your revision context.',
  },
  {
    eyebrow: 'Timed practice',
    title: 'Timed mock exams with cleaner review',
    body: 'Practice under pressure, then review with structure and clarity while the context is still fresh.',
    metric: 'Real pacing',
    note: 'Build exam rhythm before the actual test day.',
  },
  {
    eyebrow: 'Decision support',
    title: 'Progress that tells you what to do next',
    body: 'Coverage, streaks, accuracy, and weak areas stay visible so each study session has direction.',
    metric: 'Weak areas',
    note: 'Stay focused on the chapters that actually need revision.',
  },
  {
    eyebrow: 'Revision loop',
    title: 'Bookmarks and revisit flows',
    body: 'Keep difficult questions in rotation and build a smarter revision loop around mistakes.',
    metric: 'Revisit faster',
    note: 'Turn misses into a usable study queue.',
  },
  {
    eyebrow: 'Built for this exam',
    title: 'Built around the Ethiopian National Exam path',
    body: 'The product flow matches how students actually prepare: question sets, topic revision, full mocks, then progress review.',
    metric: 'One workflow',
    note: 'Practice, mocks, and progress all stay in one system.',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--background)_84%,transparent)] backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl">
              <span className="text-base font-bold text-white">e</span>
            </div>
            <span className="text-base font-semibold text-[var(--foreground)]">
              examprep
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="ui-pill rounded-full border border-[var(--border-color)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)]/76"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="brand-action rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <LandingDotGrid className="absolute inset-x-6 top-6 bottom-10 rounded-[2rem] border border-[color-mix(in_srgb,var(--accent-color)_18%,transparent)]" />

        <section className="relative z-10">
          <div className="mx-auto grid max-w-6xl gap-14 px-6 pb-14 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-18 lg:pt-24">
            <div>
              <div className="mb-6 flex flex-wrap gap-2">
                {heroPills.map((pill) => (
                  <span
                    key={pill}
                    className="ui-pill rounded-full border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-color)_88%,transparent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]"
                  >
                    {pill}
                  </span>
                ))}
              </div>

              <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl sm:leading-[1.02]">
                A sharper way to prepare for the Ethiopian National Exam.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--foreground)]/68 sm:text-lg">
                Practice with structure, sit realistic mock exams, and track
                progress in one flow that feels deliberate instead of chaotic.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="brand-action inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white"
                >
                  Create free account
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
                <Link
                  href="/login"
                  className="ui-pill rounded-full border border-[var(--border-color)] px-7 py-3.5 text-sm font-semibold text-[var(--foreground)]/80"
                >
                  See the student experience
                </Link>
              </div>

              <div className="mt-12 grid max-w-xl grid-cols-3 gap-3">
                <StatPill label="Question Bank" value="10k+" />
                <StatPill label="Mock Exams" value="Timed" />
                <StatPill label="Insights" value="Live" />
              </div>
            </div>

            <div className="relative min-h-[25rem]">
              <CardSwap
                width="100%"
                height={350}
                delay={2100}
                cardDistance={46}
                verticalDistance={42}
              >
                <SwapCard customClass="p-6">
                  <MarketingCard
                    eyebrow="Practice"
                    title="Build confidence one chapter at a time."
                    body="Question sets stay tied to the exact subject, grade, and topic you are working on."
                  />
                </SwapCard>
                <SwapCard customClass="p-6">
                  <MarketingCard
                    eyebrow="Mock Exams"
                    title="Train with realistic timing and cleaner answer review."
                    body="Switch from topic drills into timed exams without losing the context of what you were studying."
                  />
                </SwapCard>
                <SwapCard customClass="p-6">
                  <MarketingCard
                    eyebrow="Progress"
                    title="See where your score is actually leaking."
                    body="Coverage, accuracy, streaks, and weak spots stay visible so you know what to revise next."
                  />
                </SwapCard>
              </CardSwap>
            </div>
          </div>
        </section>

        <section className="relative z-10 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                Built for how students actually study
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                A warmer, more deliberate interface for practice, review, and
                exam pressure.
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch">
              {featureCards.map((feature, index) => (
                <Card
                  key={feature.title}
                  padding="lg"
                  hoverable
                  className={`h-full overflow-visible rounded-[1.5rem] ${index === featureCards.length - 1 ? 'lg:col-span-2' : ''}`}
                >
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]/82">
                        {feature.eyebrow}
                      </p>
                      <h3 className="mt-4 text-2xl font-semibold leading-tight text-[var(--foreground)]">
                        {feature.title}
                      </h3>
                      <p className="mt-4 text-sm leading-7 text-[var(--foreground)]/70 sm:text-base">
                        {feature.body}
                      </p>
                    </div>

                    <div className="mt-8 flex items-end justify-between gap-4 rounded-[1.4rem] border border-[color-mix(in_srgb,var(--accent-color)_20%,var(--border-color))] bg-[color-mix(in_srgb,var(--surface-muted)_58%,white)] px-4 py-3">
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--foreground)]/48">
                          Why it matters
                        </p>
                        <p className="mt-1 text-sm font-medium text-[var(--foreground)]/74">
                          {feature.note}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--accent-color)_26%,var(--border-color))] bg-[var(--surface-color)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)]">
                        {feature.metric}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 pb-24">
          <div className="mx-auto max-w-6xl px-6">
            <Card
              padding="lg"
              className="border-[color-mix(in_srgb,var(--accent-color)_18%,var(--border-color))] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--surface-color)_94%,white),color-mix(in_srgb,var(--surface-muted)_74%,var(--surface-color)))]"
            >
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                    Start with structure
                  </p>
                  <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                    Everything you need to go from daily practice to full exam
                    readiness.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--foreground)]/68">
                    Create an account when you are ready. The product is built
                    to keep the same calm, warm visual language from your first
                    visit through the actual study workflow.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <Link
                    href="/register"
                    className="brand-action rounded-full px-6 py-3 text-sm font-semibold text-white"
                  >
                    Get started free
                  </Link>
                  <Link
                    href="/login"
                    className="ui-pill rounded-full border border-[var(--border-color)] px-6 py-3 text-sm font-semibold text-[var(--foreground)]/78"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-color)]/75 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--foreground)]/62">
            <div className="brand-mark flex h-5 w-5 items-center justify-center rounded-md">
              <span className="text-[9px] font-bold text-white">e</span>
            </div>
            examprep
          </div>
          <div className="text-xs text-[var(--foreground)]/62">
            &copy; {new Date().getFullYear()} Exam Prep Ethiopia
          </div>
        </div>
      </footer>
    </div>
  );
}

function MarketingCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]/85">
          {eyebrow}
        </p>
        <h3 className="mt-4 text-2xl font-semibold leading-tight text-[var(--foreground)]">
          {title}
        </h3>
        <p className="mt-4 text-sm leading-7 text-[var(--foreground)]/70">
          {body}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-[color-mix(in_srgb,var(--accent-color)_22%,var(--border-color))] bg-[color-mix(in_srgb,var(--surface-muted)_72%,white)] px-4 py-3">
        <span className="text-sm font-medium text-[var(--foreground)]/76">
          Exam Prep Ethiopia
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
          Ready
        </span>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="ui-pill rounded-[1.5rem] border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-color)_86%,transparent)] px-4 py-3">
      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[var(--foreground)]/50">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
