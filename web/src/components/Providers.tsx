'use client';

import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
  endWebSessionTracking,
  startWebSessionTracking,
} from '@/lib/analyticsTracker';
import { I18nProvider } from '@/lib/i18n';
import { AppEffects } from './visual/AppEffects';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const loadUser = useAuthStore((state) => state.loadUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isAuthenticated) return;

    void startWebSessionTracking();

    const handlePageHide = () => {
      void endWebSessionTracking();
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      void endWebSessionTracking();
    };
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AppEffects>
          {children}
        </AppEffects>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '16px',
              background: '#1C1917',
              color: '#FAFAF9',
              fontSize: '13px',
              fontWeight: 500,
              padding: '12px 16px',
              border: '1px solid #292524',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            },
            success: {
              iconTheme: { primary: '#14b8a6', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#fff' },
            },
          }}
        />
      </I18nProvider>
    </QueryClientProvider>
  );
}
