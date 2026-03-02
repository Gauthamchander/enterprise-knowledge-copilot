/**
 * useAuth — custom hook to consume AuthContext.
 *
 * Always use this hook instead of useContext(AuthContext) directly.
 * It provides a clear error if used outside of <AuthProvider>.
 *
 * Example:
 *   const { user, login, logout, isAuthenticated } = useAuth();
 */
import { useContext } from 'react';
import { AuthContext } from '@/src/context/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used inside an <AuthProvider>. Wrap your app in AuthProvider.');
  }

  return context;
}
