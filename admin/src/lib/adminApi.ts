import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  clearAdminTokens,
  getAdminAccessToken,
  getAdminRefreshToken,
  setAdminTokens,
} from './adminAuth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

export const adminApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshingPromise: Promise<string | null> | null = null;

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getAdminRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });
    const { accessToken, refreshToken: nextRefreshToken } = response.data;
    if (!accessToken || !nextRefreshToken) return null;
    setAdminTokens(accessToken, nextRefreshToken);
    return accessToken;
  } catch {
    clearAdminTokens();
    return null;
  }
}

adminApiClient.interceptors.request.use((config) => {
  const token = getAdminAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshingPromise) {
      refreshingPromise = refreshAccessToken().finally(() => {
        refreshingPromise = null;
      });
    }

    const nextToken = await refreshingPromise;
    if (!nextToken) {
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers.Authorization = `Bearer ${nextToken}`;
    return adminApiClient(originalRequest);
  },
);
