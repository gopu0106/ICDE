'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Loading } from '@/components/shared/Loading';
import { EmptyState } from '@/components/shared/EmptyState';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';
import { format } from 'date-fns';

export default function VendorTransactionsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    if (!user || user.role !== 'vendor') {
      router.push('/vendor/login');
      return;
    }
    loadTransactions();
  }, [user, dateFilter]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      let startDate: Date | undefined;
      
      if (dateFilter === 'today') {
        startDate = new Date(today.setHours(0, 0, 0, 0));
      } else if (dateFilter === 'week') {
        startDate = new Date(today.setDate(today.getDate() - 7));
      } else if (dateFilter === 'month') {
        startDate = new Date(today.setMonth(today.getMonth() - 1));
      }

      const response = await api.getVendorTransactions(
        'vendor-id', // Would come from vendor context
        startDate,
        undefined,
        100,
        0
      );
      setTransactions(response.transactions || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center">
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
          <h1 className="text-2xl font-bold">Transactions</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={dateFilter === 'today' ? 'primary' : 'secondary'}
            onClick={() => setDateFilter('today')}
          >
            Today
          </Button>
          <Button
            variant={dateFilter === 'week' ? 'primary' : 'secondary'}
            onClick={() => setDateFilter('week')}
          >
            This Week
          </Button>
          <Button
            variant={dateFilter === 'month' ? 'primary' : 'secondary'}
            onClick={() => setDateFilter('month')}
          >
            This Month
          </Button>
        </div>

        {/* Summary */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold">₹{totalRevenue.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-3xl font-bold">{transactions.length}</p>
            </div>
          </div>
        </Card>

        {/* Transactions List */}
        {isLoading ? (
          <Loading />
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="Transactions will appear here once students make purchases"
          />
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <Card key={tx.id} compact>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-lg">{tx.studentName || 'Student'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-500">
                        {format(new Date(tx.createdAt), 'MMM d, yyyy • h:mm a')}
                      </p>
                      {tx.mealType && (
                        <Badge variant="primary">{tx.mealType}</Badge>
                      )}
                    </div>
                    {tx.itemName && (
                      <p className="text-sm text-gray-600 mt-1">{tx.itemName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">₹{tx.amount.toFixed(2)}</p>
                    <Badge variant="success" className="mt-1">Paid</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



