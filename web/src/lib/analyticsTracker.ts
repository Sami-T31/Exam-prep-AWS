import { apiClient } from './apiClient';

const SESSION_STORAGE_KEY = 'analytics_session_id';
const WEB_PLATFORM = 'WEB' as const;

function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || 'web-local';
}

export async function startWebSessionTracking(): Promise<void> {
  if (typeof window === 'undefined') return;

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return;

  try {
    const response = await apiClient.post<{
      tracked: boolean;
      session?: { id: string };
    }>('/analytics/sessions/start', {
      platform: WEB_PLATFORM,
      appVersion: getAppVersion(),
    });

    if (response.data.tracked && response.data.session?.id) {
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        response.data.session.id,
      );
    }
  } catch {
    // Best-effort analytics; never block UX.
  }
}

export async function endWebSessionTracking(): Promise<void> {
  if (typeof window === 'undefined') return;

  const sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) return;

  try {
    await apiClient.post(`/analytics/sessions/${sessionId}/end`);
  } catch {
    // Best-effort analytics; never block UX.
  } finally {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export async function trackFeatureEvent(
  eventName: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await apiClient.post('/analytics/events', {
      eventName,
      platform: WEB_PLATFORM,
      metadata,
    });
  } catch {
    // Best-effort analytics; never block UX.
  }
}
