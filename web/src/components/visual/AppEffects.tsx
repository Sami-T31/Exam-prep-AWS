'use client';

import { AppNavigationLayout } from '@/components/layout/AppNavigationLayout';
import { ClickSpark } from './ClickSpark';

export function AppEffects({ children }: { children: React.ReactNode }) {
  return (
    <ClickSpark
      className="relative min-h-screen"
      sparkCount={10}
      sparkRadius={20}
      sparkSize={12}
      duration={460}
      extraScale={1.1}
    >
      <div className="app-effects-shell relative z-10 min-h-screen">
        <AppNavigationLayout>{children}</AppNavigationLayout>
      </div>
    </ClickSpark>
  );
}
