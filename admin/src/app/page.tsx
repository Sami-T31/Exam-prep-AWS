'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminAccessToken } from '@/lib/adminAuth';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (getAdminAccessToken()) {
      router.replace('/dashboard');
      return;
    }
    router.replace('/login');
  }, [router]);

  return null;
}
