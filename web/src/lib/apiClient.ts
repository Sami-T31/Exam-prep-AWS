import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isRememberedSession,
} from './tokenStorage';

/**
 * Central API client used by the entire frontend.
 *
 * Why a single Axios instance?
 * - Base URL configured once (from environment variable)
 * - Auth token automatically attached to every request
 * - Token refresh handled in one place
 * - Consistent error handling across the app
 *
 * NEXT_PUBLIC_ prefix: Next.js only exposes environment variables
 * to the browser if they start with NEXT_PUBLIC_. Without this
 * prefix, the variable is only available on the server side.
 *
 * If NEXT_PUBLIC_API_URL is unset, requests use same-origin `/api/v1` and
 * next.config.ts rewrites proxy them to the Nest backend (see BACKEND_INTERNAL_URL).
 */
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');
const apiBaseURL = apiOrigin ? `${apiOrigin}/api/v1` : '/api/v1';

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

/**
 * Request interceptor: runs BEFORE every request is sent.
 *
 * It reads the access token from storage and attaches it as a Bearer
 * token in the Authorization header. This is how the backend knows
 * who's making the request.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Response interceptor: runs AFTER every response is received.
 *
 * If the server returns 401 (token expired), we attempt to refresh
 * the token using the refresh token. If the refresh succeeds, we
 * retry the original request with the new token. If the refresh
 * also fails, we log the user out.
 *
 * The `isRefreshing` flag prevents multiple concurrent 401 errors
 * from triggering multiple refresh attempts simultaneously.
 * `failedQueue` holds requests that came in while a refresh was
 * in progress — once the refresh completes, they're all retried.
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${apiBaseURL}/auth/refresh`, {
          refreshToken,
        });

        setTokens(data.accessToken, data.refreshToken, isRememberedSession());
        processQueue(null, data.accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
