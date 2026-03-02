'use client';

/**
 * Dashboard Page.
 * Auth guard is handled by (dashboard)/layout.tsx — no need for manual checks here.
 * Just use useAuth() to get the user and render the page.
 */
import { useAuth } from '@/src/hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Welcome card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Welcome back, {user?.email} 👋
        </h1>
        <p className="text-gray-500 text-sm">Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* User details card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Account</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500 w-36">User ID</span>
            <span className="text-sm text-gray-800 font-mono bg-gray-50 px-3 py-1 rounded-lg">
              {user?.id}
            </span>
          </div>

          {user?.organisationId && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 w-36">Organisation ID</span>
              <span className="text-sm text-gray-800 font-mono bg-gray-50 px-3 py-1 rounded-lg">
                {user.organisationId}
              </span>
            </div>
          )}

          {user?.departmentId && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 w-36">Department ID</span>
              <span className="text-sm text-gray-800 font-mono bg-gray-50 px-3 py-1 rounded-lg">
                {user.departmentId}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
