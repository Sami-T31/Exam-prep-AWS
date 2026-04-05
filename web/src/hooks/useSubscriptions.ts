import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './queryKeys';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  description: string;
}

interface SubscriptionStatus {
  isSubscribed: boolean;
  plan: string | null;
  expiresAt: string | null;
  subscriptionId: string | null;
}

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.subscriptions.plans,
    queryFn: async () => {
      const { data } = await apiClient.get<SubscriptionPlan[]>('/subscriptions/plans');
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: queryKeys.subscriptions.status,
    queryFn: async () => {
      const { data } = await apiClient.get<SubscriptionStatus>('/subscriptions/status');
      return data;
    },
  });
}
