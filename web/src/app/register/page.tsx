'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { registerSchema } from '@exam-prep/shared/validation/auth';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { getAuthErrorMessage } from '@/lib/authErrors';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;

    if (score <= 1) return { label: 'Weak', width: 'w-1/4', color: 'bg-red-500' };
    if (score <= 3) return { label: 'Medium', width: 'w-2/3', color: 'bg-amber-300' };
    return { label: 'Strong', width: 'w-full', color: 'bg-[var(--accent-color)]' };
  }, [password]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');

    const parsed = registerSchema.safeParse({ name, email, phone, password });
    const nextErrors: Record<string, string> = {};

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      nextErrors.name = fieldErrors.name?.[0] ?? '';
      nextErrors.email = fieldErrors.email?.[0] ?? '';
      nextErrors.phone = fieldErrors.phone?.[0] ?? '';
      nextErrors.password = fieldErrors.password?.[0] ?? '';
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!acceptedTerms) {
      nextErrors.acceptedTerms = 'You must accept the terms to continue.';
    }

    setErrors(nextErrors);
    if (!parsed.success || Object.values(nextErrors).some((value) => value)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(parsed.data.name, parsed.data.email, parsed.data.phone, parsed.data.password);
      toast.success('Account created. Please sign in.');
      router.push('/login');
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error, 'Unable to create account. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="absolute inset-0 -z-10 hero-bg" />

      <Link href="/" className="mb-10 flex items-center gap-2.5">
        <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-2xl">
          <span className="text-lg font-bold text-white">e</span>
        </div>
        <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">examprep</span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-[var(--border-color)]/75 bg-[var(--surface-color)] p-8 shadow-xl shadow-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]">
          <h1 className="text-center text-xl font-bold text-[var(--foreground)]">
            Create your account
          </h1>
          <p className="mt-1.5 text-center text-sm text-[var(--foreground)]/62">
            Start preparing for your exams today
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Abebe Bekele"
              autoComplete="name"
              error={errors.name}
              disabled={isSubmitting}
            />
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
              label="Phone Number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+251912345678 or 0912345678"
              autoComplete="tel"
              error={errors.phone}
              disabled={isSubmitting}
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a strong password"
              autoComplete="new-password"
              error={errors.password}
              disabled={isSubmitting}
            />
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs text-stone-500 dark:text-stone-400">Password strength</p>
                <p className="text-xs font-medium text-stone-600 dark:text-stone-300">{passwordStrength.label}</p>
              </div>
              <div className="h-2 rounded-full bg-stone-200 dark:bg-stone-800">
                <div className={`h-2 rounded-full transition-all ${passwordStrength.width} ${passwordStrength.color}`} />
              </div>
            </div>
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              error={errors.confirmPassword}
              disabled={isSubmitting}
            />

            <label className="inline-flex items-start gap-2 text-sm text-stone-600 dark:text-stone-300">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[var(--border-color)]"
                style={{ accentColor: 'var(--accent-color)' }}
              />
              <span>
                I agree to the Terms of Service and Privacy Policy.
              </span>
            </label>
            {errors.acceptedTerms && (
              <p className="text-xs text-red-500 dark:text-red-400">{errors.acceptedTerms}</p>
            )}

            {submitError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {submitError}
              </p>
            )}

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Create account
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-[var(--foreground)]/62">
          Already have an account?{' '}
          <Link href="/login" className="accent-link font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
