export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: 'success' | 'error';
  data?: {
    user: {
      id: string;
      email: string;
      organisationId: string | null;
      departmentId: string | null;
    };
    accessToken: string;
  };
  message?: string;
}

export interface User {
  id: string;
  email: string;
  organisationId: string | null;
  departmentId: string | null;
}
