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
  
  // Get token from localStorage if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  // Prepare headers as Record<string, string>
  const headers: Record<string, string> = {};
  
  // Copy existing headers if they're a plain object
  if (options.headers && typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
    Object.assign(headers, options.headers);
  }
  
  // Add Content-Type only if not FormData (for file uploads)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
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

export const documentsApi = {
  getAll: async () => {
    return apiRequest<{ status: 'success'; data: { documents: any[] } }>('/api/documents', {
      method: 'GET',
    });
  },
  
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest<{ status: 'success'; data: any }>('/api/documents', {
      method: 'POST',
      body: formData,
    });
  },
  
  delete: async (documentId: string) => {
    return apiRequest<{ status: 'success'; message?: string }>(`/api/documents/${documentId}`, {
      method: 'DELETE',
    });
  },
};
