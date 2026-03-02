/**
 * Auth Service — business logic layer.
 *
 * This sits between the raw API (lib/api.ts) and the UI.
 * Components never call lib/api.ts directly — they call this service.
 *
 * lib/api.ts  →  authService.ts  →  AuthContext  →  Components
 */
import { authApi } from '@/src/lib/api';
import { LoginResponse, User } from '@/src/types/auth';

export interface LoginResult {
  user: User;
  accessToken: string;
}

export const authService = {
  /**
   * Authenticates the user.
   * Throws an error with a user-friendly message if login fails.
   */
  login: async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = (await authApi.login(email, password)) as LoginResponse;

      // Backend returns { status: 'success', data: { user, accessToken } }
      if (response.status === 'success' && response.data) {
        return response.data;
      }

      // This shouldn't happen if apiRequest is working correctly, but just in case
      throw new Error(response.message || 'Login failed. Please try again.');
    } catch (error) {
      // Re-throw ApiError from apiRequest with the proper message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed. Please try again.');
    }
  },
};
