'use client';

/**
 * LoginForm component.
 *
 * Responsibilities:
 * - Handles form state and client-side validation
 * - Calls useAuth().login() — does NOT touch localStorage or API directly
 * - Redirects to dashboard on success
 */
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/src/components/ui/Input';
import Button from '@/src/components/ui/Button';
import { useAuth } from '@/src/hooks/useAuth';
import { ROUTES } from '@/src/constants/routes';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // login() in AuthContext handles: API call → storage → state update
      await login(email, password);
      router.push(ROUTES.DASHBOARD);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Login failed. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* General error */}
      {errors.general && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {errors.general}
        </div>
      )}

      <Input
        type="email"
        label="Email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        disabled={isLoading}
      />

      <Input
        type="password"
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        disabled={isLoading}
      />

      <Button
        type="submit"
        variant="primary"
        isLoading={isLoading}
        className="w-full"
      >
        Sign In
      </Button>
    </form>
  );
}
