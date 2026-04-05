'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStatus, queryKeys } from '@/hooks';
import {
  Badge,
  BreadcrumbTrail,
  Button,
  Card,
  EmptyState,
  Skeleton,
} from '@/components/ui';

interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  method: 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  verifiedAt: string | null;
  providerReference: string | null;
  subscription: {
    plan: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    expiresAt: string;
  };
}

export default function AccountSubscriptionPage() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const { data: status, isLoading: statusLoading, error: statusError, refetch } = useSubscriptionStatus();
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: queryKeys.payments.history,
    queryFn: async () => {
      const { data } = await apiClient.get<PaymentHistoryItem[]>('/payments/history');
      return data;
    },
  });

  const isLoading = statusLoading || paymentsLoading;
  const error = statusError ? 'Unable to load subscription details.' : '';

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
            { label: 'Subscription' },
          ]}
        />

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Subscription Status</h1>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">
              Check your plan, renewal status, and payment history.
            </p>
          </div>
          <Link
            href="/subscribe"
            className="brand-action inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition-all"
          >
            Renew / Upgrade
          </Link>
        </div>

        {error && (
          <Card className="mb-6 border-red-200/70 bg-red-50/60">
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
              Retry
            </Button>
          </Card>
        )}

        <Card className="mb-6" padding="lg">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/65">Current Plan</p>
                <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                  {status?.isSubscribed ? status.plan : 'Free Tier'}
                </p>
                <p className="mt-0.5 text-sm text-[var(--foreground)]/70">
                  {status?.isSubscribed && status.expiresAt
                    ? `Expires ${new Date(status.expiresAt).toLocaleString()}`
                    : 'Upgrade for unlimited access'}
                </p>
              </div>
              <Badge variant={status?.isSubscribed ? 'success' : 'warning'}>
                {status?.isSubscribed ? 'Active' : 'Not Subscribed'}
              </Badge>
            </div>
          )}
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Payment History</h2>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : payments.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No payments yet" description="Your payment activity will appear here." />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="rounded-2xl border border-[var(--border-color)] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {payment.subscription.plan} - {payment.amount} {payment.currency}
                      </p>
                      <p className="text-xs text-[var(--foreground)]/70">
                        {payment.method} - {new Date(payment.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={payment.status === 'COMPLETED' ? 'success' : payment.status === 'FAILED' ? 'danger' : 'warning'}
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}



