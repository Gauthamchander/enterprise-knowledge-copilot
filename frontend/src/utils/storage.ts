/**
 * Centralizes all localStorage operations related to auth.
 * Never call localStorage.getItem('accessToken') directly in components — use this instead.
 */
import { User } from '@/src/types/auth';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

export const storage = {
  // --- Token ---
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },

  // --- User ---
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as User;
    } catch {
      return null;
    }
  },

  setUser: (user: User): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser: (): void => {
    localStorage.removeItem(USER_KEY);
  },

  // --- Clear everything ---
  clearAuth: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
