import { create } from 'zustand';
import { apiClient } from '@/lib/apiClient';
import { setTokens, clearTokens, getAccessToken, getRefreshToken } from '@/lib/tokenStorage';

/**
 * Zustand is a state management library — much simpler than Redux.
 *
 * A "store" is a JavaScript object that holds state (data) and
 * actions (functions to change that data). Any component can
 * read from the store and React will re-render it when the
 * relevant state changes.
 *
 * Think of it like a global variable that React components can
 * subscribe to. When the variable changes, only the components
 * that use it re-render — not the entire page.
 */

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password, remember = true) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    setTokens(data.accessToken, data.refreshToken, remember);
    set({
      user: data.user,
      isAuthenticated: true,
    });
  },

  register: async (name, email, phone, password) => {
    await apiClient.post('/auth/register', {
      name,
      email,
      phone,
      password,
    });
  },

  logout: async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Even if the server call fails, clear local state
    }
    clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: () => {
    const token = getAccessToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]!));
      set({
        user: { id: payload.sub, name: '', email: '', role: payload.role },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    apiClient
      .get<User>('/auth/me')
      .then(({ data }) => {
        set({ user: data, isAuthenticated: true });
      })
      .catch(() => {
        // JWT decode already set partial user; keep it if /me fails
      });
  },
}));
