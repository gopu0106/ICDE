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

interface Transaction {
  id: string;
  transactionType: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  referenceType: string;
}

export default function TransactionHistoryPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');

  useEffect(() => {
    if (!user) {
      router.push('/student/login');
      return;
    }
    loadTransactions();
  }, [user, filter]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await api.getWalletTransactions(50, offset);
      const filtered = filter === 'all'
        ? response.transactions
        : response.transactions.filter((tx: Transaction) => tx.transactionType === filter);
      
      setTransactions(filtered);
      setHasMore(response.transactions.length === 50);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter((tx) => tx.transactionType === filter);

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
          <h1 className="text-xl font-bold">Transaction History</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'credit' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('credit')}
          >
            Credits
          </Button>
          <Button
            variant={filter === 'debit' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('debit')}
          >
            Debits
          </Button>
        </div>

        {isLoading ? (
          <Loading />
        ) : filteredTransactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="Your transaction history will appear here"
          />
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <Card key={tx.id} compact>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {tx.description || 'Transaction'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {format(new Date(tx.createdAt), 'MMM d, yyyy • h:mm a')}
                      </p>
                      <Badge
                        variant={
                          tx.transactionType === 'credit' ? 'success' : 'gray'
                        }
                      >
                        {tx.referenceType}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        tx.transactionType === 'credit'
                          ? 'text-success-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {tx.transactionType === 'credit' ? '+' : '-'}₹
                      {tx.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Balance: ₹{tx.balanceAfter.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {hasMore && !isLoading && (
          <div className="mt-6">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setOffset(offset + 50);
                loadTransactions();
              }}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}



