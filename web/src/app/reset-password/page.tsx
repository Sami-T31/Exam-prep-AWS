'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { resetPasswordSchema } from '@exam-prep/shared/validation/auth';
import { apiClient } from '@/lib/apiClient';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { Button, Input } from '@/components/ui';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordPageShell />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = resetPasswordSchema.safeParse({ token, password });
    const nextErrors: Record<string, string> = {};

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      nextErrors.password = fieldErrors.password?.[0] ?? '';
      if (fieldErrors.token?.[0]) {
        nextErrors.submit = 'Reset token is missing or invalid. Please request a new link.';
      }
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    if (!parsed.success || Object.values(nextErrors).some((value) => value)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', { token: parsed.data.token, password: parsed.data.password });
      toast.success('Password reset successful. You can now sign in.');
      router.push('/login');
    } catch (submitError) {
      setErrors({
        submit: getAuthErrorMessage(
          submitError,
          'Unable to reset password. The token may be invalid or expired.',
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ResetPasswordPageShell>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Input
          label="New Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          error={errors.password}
          disabled={isSubmitting}
        />
        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          error={errors.confirmPassword}
          disabled={isSubmitting}
        />

        {errors.submit && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {errors.submit}
          </p>
        )}

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Reset password
        </Button>
      </form>
    </ResetPasswordPageShell>
  );
}

function ResetPasswordPageShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="absolute inset-0 -z-10 hero-bg" />

      <div className="w-full max-w-sm rounded-3xl border border-[var(--border-color)]/75 bg-[var(--surface-color)] p-8 shadow-xl shadow-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]">
        <h1 className="text-center text-xl font-bold text-[var(--foreground)]">Reset Password</h1>
        <p className="mt-1.5 text-center text-sm text-[var(--foreground)]/62">
          Set a new password for your account.
        </p>
        {children}

        <p className="mt-6 text-center text-sm text-[var(--foreground)]/62">
          Back to{' '}
          <Link href="/login" className="accent-link font-semibold">
            sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
