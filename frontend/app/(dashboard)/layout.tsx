'use client';

/**
 * (dashboard) route group layout — AUTH GUARD.
 * Applied to all pages inside app/(dashboard)/ — dashboard, settings, etc.
 *
 * This layout:
 * 1. Checks if the user is authenticated via AuthContext.
 * 2. Redirects to /login if not authenticated.
 * 3. Shows Navbar for all protected pages.
 *
 * Adding a new protected page? Just put it inside app/(dashboard)/ and
 * it automatically gets auth protection + Navbar — no extra code needed.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import { ROUTES } from '@/src/constants/routes';
import Navbar from '@/src/components/layout/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
  }, [isAuthenticated, isLoading, router]);

  // While checking auth, show a full-screen loader
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — render nothing (redirect is in-flight)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
