'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { forgotPasswordSchema } from '@exam-prep/shared/validation/auth';
import { apiClient } from '@/lib/apiClient';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { Button, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.email?.[0] ?? 'Please enter a valid email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: parsed.data.email });
      toast.success('If your email exists, reset instructions were sent.');
      setEmail('');
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, 'Unable to process request right now.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="absolute inset-0 -z-10 hero-bg" />

      <div className="w-full max-w-sm rounded-3xl border border-[var(--border-color)]/75 bg-[var(--surface-color)] p-8 shadow-xl shadow-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]">
        <h1 className="text-center text-xl font-bold text-[var(--foreground)]">Forgot Password</h1>
        <p className="mt-1.5 text-center text-sm text-[var(--foreground)]/62">
          Enter your email and we&apos;ll send reset instructions.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isSubmitting}
          />
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Send reset link
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--foreground)]/62">
          Remembered your password?{' '}
          <Link href="/login" className="accent-link font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
