'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function TopUpPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      await api.topupWallet(amountNum, 'online');
      setSuccess(true);
      setTimeout(() => {
        router.push('/student/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Top-up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-success-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Top-up Successful!</h2>
          <p className="text-gray-600">₹{amount} has been added to your wallet.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Top Up Wallet</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Amount
              </label>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_AMOUNTS.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => setAmount(quickAmount.toString())}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 font-medium transition-all"
                  >
                    ₹{quickAmount}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="1"
              step="0.01"
              required
            />

            <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
              Add to Wallet
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}



