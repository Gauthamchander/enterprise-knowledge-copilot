'use client';

/**
 * AuthContext — global authentication state.
 *
 * Wraps the entire app (in app/layout.tsx) so ANY component can access:
 *   - user        → the logged-in user object (or null)
 *   - isAuthenticated → boolean shorthand
 *   - isLoading   → true while reading from localStorage on first render
 *   - login()     → authenticates and stores the session
 *   - logout()    → clears the session
 *
 * Usage: const { user, login, logout } = useAuth();
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '@/src/services/authService';
import { storage } from '@/src/utils/storage';
import { User } from '@/src/types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true until we read localStorage

  // On mount: restore session from localStorage
  useEffect(() => {
    const token = storage.getToken();
    const savedUser = storage.getUser();

    if (token && savedUser) {
      setUser(savedUser);
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const { user: loggedInUser, accessToken } = await authService.login(email, password);

    // Persist to localStorage
    storage.setToken(accessToken);
    storage.setUser(loggedInUser);

    // Update React state
    setUser(loggedInUser);
  };

  const logout = (): void => {
    storage.clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
