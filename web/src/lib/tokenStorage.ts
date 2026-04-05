/**
 * Token Storage utility — stores tokens in both localStorage AND cookies.
 *
 * Why both?
 * - localStorage: easy to read from JavaScript (for API requests)
 * - Cookies: readable by Next.js middleware (server-side, before page loads)
 *
 * The middleware checks the cookie to decide if the user is logged in
 * (redirect to login or dashboard). The API client reads localStorage
 * to attach the token to API requests.
 *
 * Cookie settings:
 * - path=/: accessible from any page
 * - SameSite=Lax: protects against cross-site attacks while allowing
 *   normal navigation (e.g., clicking a link from email)
 * - max-age: how long the cookie lives (in seconds)
 */

export function setTokens(accessToken: string, refreshToken: string, remember = true) {
  if (typeof window === 'undefined') return;

  if (remember) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
  } else {
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('refreshToken', refreshToken);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  const isSecure = window.location.protocol === 'https:';
  const securePart = isSecure ? '; Secure' : '';
  const cookieMaxAge = remember ? `; max-age=${60 * 60 * 24 * 7}` : '';
  document.cookie = `accessToken=${accessToken}; path=/; SameSite=Lax${securePart}${cookieMaxAge}`;

  if (remember) {
    document.cookie = `hasRefreshToken=1; path=/; SameSite=Lax${securePart}; max-age=${60 * 60 * 24 * 7}`;
  } else {
    document.cookie = `hasRefreshToken=1; path=/; SameSite=Lax${securePart}`;
  }
}

export function clearTokens() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');

  document.cookie = 'accessToken=; path=/; max-age=0';
  document.cookie = 'hasRefreshToken=; path=/; max-age=0';
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
}

export function isRememberedSession(): boolean {
  if (typeof window === 'undefined') return true;
  return !!localStorage.getItem('refreshToken');
}
