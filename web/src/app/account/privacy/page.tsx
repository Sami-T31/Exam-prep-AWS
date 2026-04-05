'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { useConsent, useUpdateConsent } from '@/hooks';
import { BreadcrumbTrail, Button, Card } from '@/components/ui';

export default function PrivacyDataPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const { data: consent, isLoading } = useConsent();
  const updateConsent = useUpdateConsent();

  const isSaving = updateConsent.isPending || isDeletingAccount;

  function handleConsentChange(field: string, checked: boolean) {
    updateConsent.mutate(
      { [field]: checked },
      {
        onSuccess: () => toast.success('Privacy settings updated.'),
        onError: () => toast.error('Could not update privacy settings.'),
      },
    );
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      'This permanently deletes your account and data. This action cannot be undone. Continue?',
    );
    if (!confirmed) return;

    setIsDeletingAccount(true);
    try {
      await apiClient.delete('/users/me');
      await logout();
      toast.success('Your account has been deleted.');
      router.push('/login');
    } catch {
      toast.error('Unable to delete account right now.');
      setIsDeletingAccount(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] page-gradient">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <BreadcrumbTrail
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Privacy & Data' },
          ]}
        />

        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Privacy & Data
        </h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/70">
          Manage consent preferences and account deletion.
        </p>

        <Card className="mt-6" padding="lg">
          {isLoading || !consent ? (
            <p className="text-sm text-[var(--foreground)]/70">
              Loading settings...
            </p>
          ) : (
            <div className="space-y-4">
              <ConsentToggle
                label="Analytics"
                description="Allow session and feature usage analytics to improve product quality."
                checked={consent.analyticsOptIn}
                disabled={isSaving}
                onChange={(checked) => handleConsentChange('analyticsOptIn', checked)}
              />
              <ConsentToggle
                label="Personalization"
                description="Allow personalized study insights (weak topics, study recommendations)."
                checked={consent.personalizationOptIn}
                disabled={isSaving}
                onChange={(checked) => handleConsentChange('personalizationOptIn', checked)}
              />
              <ConsentToggle
                label="Marketing"
                description="Allow product announcements and promotional updates."
                checked={consent.marketingOptIn}
                disabled={isSaving}
                onChange={(checked) => handleConsentChange('marketingOptIn', checked)}
              />
            </div>
          )}
        </Card>

        <Card
          className="mt-4 border-red-200/60"
          padding="lg"
        >
          <h2 className="text-lg font-semibold text-red-700">
            Delete Account
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            Permanently remove your account and associated data.
          </p>
          <Button
            className="mt-4"
            variant="danger"
            onClick={() => void deleteAccount()}
            disabled={isSaving}
          >
            Delete My Account
          </Button>
        </Card>
      </main>
    </div>
  );
}

function ConsentToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] p-4">
      <span>
        <span className="block text-sm font-semibold text-[var(--foreground)]">
          {label}
        </span>
        <span className="mt-1 block text-xs text-[var(--foreground)]/70">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        className="h-5 w-5"
        style={{ accentColor: 'var(--accent-color)' }}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
