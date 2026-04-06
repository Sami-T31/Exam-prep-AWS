'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { loginSchema } from '@exam-prep/shared/validation/auth';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { trackFeatureEvent } from '@/lib/analyticsTracker';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageShell />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const callbackUrl = searchParams.get('callbackUrl');
  const isFromLogout = searchParams.get('fromLogout') === '1';
  const safeCallbackUrl =
    !isFromLogout && callbackUrl?.startsWith('/')
      ? callbackUrl
      : '/dashboard';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0] ?? '',
        password: fieldErrors.password?.[0] ?? '',
      });
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await login(parsed.data.email, parsed.data.password, remember);
      void trackFeatureEvent('login_success');
      toast.success('Logged in successfully.');
      router.push(safeCallbackUrl);
    } catch (error) {
      setSubmitError(
        getAuthErrorMessage(error, 'Unable to sign in. Please try again.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <LoginPageShell>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email}
          disabled={isSubmitting}
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-color)]"
              style={{ accentColor: 'var(--accent-color)' }}
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="accent-link text-sm font-medium"
          >
            Forgot password?
          </Link>
        </div>

        {submitError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {submitError}
          </p>
        )}

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </LoginPageShell>
  );
}

function LoginPageShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="absolute inset-0 -z-10 hero-bg" />

      <Link href="/" className="mb-10 flex items-center gap-2.5">
        <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-2xl">
          <span className="text-lg font-bold text-white">e</span>
        </div>
        <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">
          examprep
        </span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-[var(--border-color)]/75 bg-[var(--surface-color)] p-8 shadow-xl shadow-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]">
          <h1 className="text-center text-xl font-bold text-[var(--foreground)]">
            Welcome back
          </h1>
          <p className="mt-1.5 text-center text-sm text-[var(--foreground)]/62">
            Sign in to continue your preparation
          </p>
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-[var(--foreground)]/62">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="accent-link font-semibold"
          >
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
