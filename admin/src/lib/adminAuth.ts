const ACCESS_KEY = 'admin_access_token';
const REFRESH_KEY = 'admin_refresh_token';

export function setAdminTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function getAdminAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getAdminRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function clearAdminTokens() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}
