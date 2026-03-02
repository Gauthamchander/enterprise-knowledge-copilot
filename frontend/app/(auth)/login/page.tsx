import LoginForm from '@/src/components/auth/LoginForm';

export const metadata = {
  title: 'Sign In — Enterprise Copilot',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to your account to continue</p>
          </div>

          <LoginForm />

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Don&apos;t have an account?{' '}
              <a href="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
