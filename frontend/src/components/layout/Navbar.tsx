'use client';

/**
 * Navbar — top navigation bar for all authenticated (dashboard) pages.
 * Reads user info from AuthContext and provides a logout button.
 */
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import { ROUTES } from '@/src/constants/routes';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push(ROUTES.LOGIN);
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-indigo-600">Enterprise</span>
            <span className="text-xl font-semibold text-gray-700">Copilot</span>
          </div>

          {/* Right side: user info + logout */}
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-600 hidden sm:block">
                {user.email}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
