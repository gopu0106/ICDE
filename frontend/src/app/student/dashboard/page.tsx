'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WalletBalance } from '@/components/student/WalletBalance';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { Loading } from '@/components/shared/Loading';
import { Badge } from '@/components/shared/Badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  transactionType: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/student/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [balanceRes, summaryRes, transactionsRes] = await Promise.all([
        api.getWalletBalance(),
        api.getWalletSummary(),
        api.getWalletTransactions(10, 0),
      ]);

      setBalance(balanceRes.balance);
      setSummary(summaryRes);
      setTransactions(transactionsRes.transactions || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    clearAuth();
    router.push('/student/login');
  };

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">CampusSync</h1>
            <p className="text-sm text-gray-600">{user?.fullName}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Wallet Balance */}
        <WalletBalance balance={balance} />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            size="lg"
            onClick={() => router.push('/student/scan')}
            className="h-20 flex flex-col items-center justify-center"
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            Scan QR
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/student/history')}
            className="h-20 flex flex-col items-center justify-center"
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            History
          </Button>
        </div>

        {/* Today's Spending */}
        {summary?.statistics && (
          <Card>
            <h2 className="text-lg font-semibold mb-4">Today's Spending</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Amount</span>
                <span className="text-xl font-bold text-gray-900">
                  ₹{summary.statistics.todaySpent.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Transactions</span>
                <span className="font-medium">{summary.statistics.todayDebits}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
            <button
              onClick={() => router.push('/student/history')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
            </button>
          </div>

          {transactions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {tx.description || 'Transaction'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(tx.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        tx.transactionType === 'credit'
                          ? 'text-success-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {tx.transactionType === 'credit' ? '+' : '-'}₹
                      {tx.amount.toFixed(2)}
                    </p>
                    <Badge variant={tx.transactionType === 'credit' ? 'success' : 'gray'}>
                      {tx.transactionType}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push('/student/analytics')}
          >
            Analytics
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/student/topup')}
          >
            Top Up
          </Button>
        </div>
      </div>
    </div>
  );
}



