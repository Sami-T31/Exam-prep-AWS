import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './queryKeys';

interface Stream {
  id: number;
  name: string;
  slug: string;
  subjects: Array<{ id: number; name: string; icon: string | null }>;
}

export function useStreams() {
  return useQuery({
    queryKey: queryKeys.streams.all,
    queryFn: async () => {
      const { data } = await apiClient.get<Stream[]>('/streams');
      return data;
    },
  });
}
