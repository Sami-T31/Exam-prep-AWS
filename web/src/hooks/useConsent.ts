import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './queryKeys';

interface Consent {
  analyticsOptIn: boolean;
  personalizationOptIn: boolean;
  marketingOptIn: boolean;
  acceptedTermsAt: string | null;
  acceptedPrivacyAt: string | null;
}

export function useConsent() {
  return useQuery({
    queryKey: queryKeys.consent.current,
    queryFn: async () => {
      const { data } = await apiClient.get<Consent>('/users/me/consent');
      return data;
    },
  });
}

export function useUpdateConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nextConsent: Partial<Consent>) => {
      const { data } = await apiClient.put<Consent>('/users/me/consent', nextConsent);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.consent.current, data);
    },
  });
}
