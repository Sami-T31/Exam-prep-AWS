'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { usePlans, useSubscriptionStatus, queryKeys } from '@/hooks';
import {
  Badge,
  BreadcrumbTrail,
  Button,
  Card,
  EmptyState,
  Skeleton,
} from '@/components/ui';

type PlanId = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
type PaymentMethod = 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER';

interface PaymentInitiateResponse {
  subscriptionId: string;
  paymentId: string;
  plan: PlanId;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider?: string;
  status?: string;
  message?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
}

export default function SubscribePage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const cancelledRef = useRef(false);

  const [isInitiating, setIsInitiating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, []);

  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: status = null, isLoading: statusLoading } = useSubscriptionStatus();

  const isLoading = plansLoading || statusLoading;

  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paymentResult, setPaymentResult] = useState<PaymentInitiateResponse | null>(null);

  useEffect(() => {
    if (plans.length > 0 && selectedPlanId === null) {
      setSelectedPlanId(plans[0]?.id as PlanId ?? null);
    }
  }, [plans, selectedPlanId]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  async function pollStatusUntilVerified() {
    setIsVerifying(true);
    const maxChecks = 12;
    for (let checkIndex = 0; checkIndex < maxChecks; checkIndex++) {
      if (cancelledRef.current) return;
      try {
        const response = await apiClient.get('/subscriptions/status');
        if (cancelledRef.current) return;
        const data = response.data as { isSubscribed: boolean };
        queryClient.setQueryData(queryKeys.subscriptions.status, response.data);
        if (data.isSubscribed) {
          toast.success('Subscription is now active.');
          setIsVerifying(false);
          return;
        }
      } catch {
        if (cancelledRef.current) return;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    if (!cancelledRef.current) {
      setIsVerifying(false);
    }
  }

  async function initiatePayment() {
    if (!selectedPlan) return;
    setError('');
    setPaymentResult(null);
    setIsInitiating(true);
    try {
      const response = await apiClient.post<PaymentInitiateResponse>('/payments/initiate', {
        plan: selectedPlan.id,
        method: selectedMethod,
      });
      setPaymentResult(response.data);

      if (selectedMethod === 'BANK_TRANSFER') {
        toast.success('Bank transfer request created. Awaiting admin verification.');
      } else {
        toast.success('Payment started. Verifying status...');
      }

      void pollStatusUntilVerified();
    } catch {
      setError('Payment initiation failed. Please retry.');
    } finally {
      setIsInitiating(false);
    }
  }

  const isBusy = isInitiating || isVerifying;
  const isSubscribed = status?.isSubscribed ?? false;

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
            { label: 'Subscribe' },
          ]}
        />

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Upgrade to <span className="gradient-text-accent">Premium</span></h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            Get unlimited question practice, full mock exams, and advanced analytics.
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-red-200/70 bg-red-50/60">
            <p className="text-sm text-red-700">{error}</p>
          </Card>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState title="No plans available" description="Plans are not configured yet." />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={selectedPlanId === plan.id ? 'border-[var(--accent-color)] bg-gradient-to-br from-[color-mix(in_srgb,var(--accent-color)_14%,white)] to-transparent shadow-lg shadow-[color-mix(in_srgb,var(--accent-color)_18%,transparent)]' : ''}
                  padding="lg"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">{plan.name}</h2>
                    {plan.id === 'QUARTERLY' && <Badge variant="warning">Recommended</Badge>}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
                    {plan.price} {plan.currency}
                  </p>
                  <p className="mt-1 text-xs text-[var(--foreground)]/70">{plan.description}</p>
                  <p className="mt-1 text-xs text-[var(--foreground)]/70">{plan.durationDays} days access</p>
                  <Button
                    className="mt-4 w-full"
                    variant={selectedPlanId === plan.id ? 'primary' : 'outline'}
                    onClick={() => setSelectedPlanId(plan.id as PlanId)}
                  >
                    {selectedPlanId === plan.id ? 'Selected' : 'Choose Plan'}
                  </Button>
                </Card>
              ))}
            </div>

            <Card className="mt-6" padding="lg">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Payment Method</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {([
                  { id: 'TELEBIRR', label: 'Telebirr', hint: 'Provider integration pending' },
                  { id: 'CBE_BIRR', label: 'CBE Birr', hint: 'Provider integration pending' },
                  { id: 'BANK_TRANSFER', label: 'Bank Transfer', hint: 'Manual verification flow' },
                ] as Array<{ id: PaymentMethod; label: string; hint: string }>).map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`rounded-2xl border p-3 text-left ${
                      selectedMethod === method.id
                        ? 'border-[var(--accent-color)] bg-gradient-to-r from-[color-mix(in_srgb,var(--accent-color)_16%,white)] to-[color-mix(in_srgb,var(--surface-muted)_70%,white)] shadow-sm'
                        : 'border-[var(--border-color)]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--foreground)]">{method.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--foreground)]/70">{method.hint}</p>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button onClick={initiatePayment} disabled={!selectedPlan || isBusy || isSubscribed} isLoading={isBusy}>
                  {isVerifying ? 'Verifying payment...' : 'Initiate Payment'}
                </Button>
                <Button variant="outline" onClick={initiatePayment} disabled={!error || isBusy || isSubscribed}>
                  Retry Failed Payment
                </Button>
                <Link
                  href="/account/subscription"
                  className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
                >
                  View Subscription Status
                </Link>
              </div>

              {paymentResult && (
                <div className="mt-4 rounded-2xl border border-[var(--border-color)] p-4 text-sm">
                  <p className="font-semibold text-[var(--foreground)]">Payment Created</p>
                  <p className="mt-1 text-[var(--foreground)]/80">Payment ID: {paymentResult.paymentId}</p>
                  <p className="text-[var(--foreground)]/80">Status: {paymentResult.status || 'PENDING'}</p>
                  {paymentResult.message && (
                    <p className="mt-1 text-[var(--foreground)]/80">{paymentResult.message}</p>
                  )}
                  {paymentResult.bankDetails && (
                    <div className="mt-2 rounded-xl bg-[var(--surface-muted)]/65 p-3 text-[var(--foreground)]">
                      <p>Bank: {paymentResult.bankDetails.bankName}</p>
                      <p>Account: {paymentResult.bankDetails.accountNumber}</p>
                      <p>Name: {paymentResult.bankDetails.accountName}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card className="mt-6" padding="lg">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Free vs Premium</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border-color)] p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Free Tier</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--foreground)]/80">
                    <li>Limited question access per subject</li>
                    <li>Basic practice features</li>
                    <li>No guaranteed premium access</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-[var(--accent-color)]/70 bg-gradient-to-br from-[color-mix(in_srgb,var(--accent-color)_16%,white)] to-[color-mix(in_srgb,var(--surface-muted)_72%,white)] p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Premium</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--foreground)]/80">
                    <li>Unlimited questions and topics</li>
                    <li>Full mock exam experience</li>
                    <li>Subscription status + payment tracking</li>
                  </ul>
                </div>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

