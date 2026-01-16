'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { api } from '@/lib/api';

export default function StudentRegisterPage() {
  const router = useRouter();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await api.register({
        email,
        password,
        fullName,
        role: 'student',
      });
      
      // Show success and redirect to login
      router.push('/student/login?registered=true');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CampusSync</h1>
          <p className="text-gray-600">Create your student account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="John Doe"
            />

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
              helperText="Must be at least 8 characters"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
            />

            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              size="lg"
            >
              Register
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Already have an account?{' '}
              <a
                href="/student/login"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign In
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


