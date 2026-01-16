'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';

export default function StudentLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.login(email, password);
      setAuth(
        response.user,
        response.accessToken,
        response.refreshToken
      );
      router.push('/student/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CampusSync</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="student@university.edu"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />

            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              size="lg"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Don't have an account?{' '}
              <a
                href="/student/register"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Register
              </a>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <a
            href="/vendor/login"
            className="hover:text-gray-700"
          >
            Vendor Login
          </a>
          {' • '}
          <a
            href="/admin/login"
            className="hover:text-gray-700"
          >
            Admin Login
          </a>
        </div>
      </div>
    </div>
  );
}



