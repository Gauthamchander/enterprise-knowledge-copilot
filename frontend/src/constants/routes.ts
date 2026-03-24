/**
 * Centralized route constants.
 * Always use these instead of hardcoding strings like '/login' in components.
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  DOCUMENTS: '/documents',
  CHAT: '/chat',
} as const;
