/**
 * API Client — handles all HTTP requests to the backend.
 *
 * Backend response format:
 * - Success: { status: 'success', data: {...} }
 * - Error:   { status: 'error', message: '...' }
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    // Backend returns { status: 'error', message: '...' } on errors
    if (!response.ok || data.status === 'error') {
      const errorMessage = data.message || `HTTP error! status: ${response.status}`;
      throw new ApiError(errorMessage, response.status);
    }

    // Backend returns { status: 'success', data: {...} } on success
    return data as T;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Network errors, JSON parse errors, etc.
    if (error instanceof Error) {
      throw new ApiError(error.message, 0);
    }

    throw new ApiError('An unexpected error occurred', 0);
  }
}

export const authApi = {
  login: async (email: string, password: string) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};
