'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Loading } from '@/components/shared/Loading';
import { Badge } from '@/components/shared/Badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';
import { format } from 'date-fns';

export default function VendorDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  
  const [vendor, setVendor] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'vendor') {
      router.push('/vendor/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Get vendor info (assuming vendorId is stored or fetched)
      // For now, we'll need to get vendor by user ID
      // This would require a backend endpoint or we store vendorId in user metadata
      const today = new Date().toISOString().split('T')[0];
      const performanceRes = await api.getVendorPerformance('vendor-id', today);
      setPerformance(performanceRes);
      
      // Mock recent transactions for now
      setRecentTransactions([]);
    } catch (error) {
      console.error('Failed to load vendor data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    clearAuth();
    router.push('/vendor/login');
  };

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
            <p className="text-sm text-gray-600">{user?.fullName}</p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            size="lg"
            onClick={() => router.push('/vendor/scan')}
            className="h-24 flex flex-col items-center justify-center text-lg"
          >
            <svg
              className="w-8 h-8 mb-2"
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
            Scan Student QR
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/vendor/transactions')}
            className="h-24 flex flex-col items-center justify-center text-lg"
          >
            <svg
              className="w-8 h-8 mb-2"
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
            Transactions
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/vendor/summary')}
            className="h-24 flex flex-col items-center justify-center text-lg"
          >
            <svg
              className="w-8 h-8 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Daily Summary
          </Button>
        </div>

        {/* Today's Stats */}
        {performance && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <p className="text-sm text-gray-600 mb-1">Today's Revenue</p>
              <p className="text-2xl font-bold">
                ₹{performance.summary?.todayRevenue?.toFixed(2) || '0.00'}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 mb-1">Transactions</p>
              <p className="text-2xl font-bold">
                {performance.summary?.totalTransactions || 0}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 mb-1">Customers</p>
              <p className="text-2xl font-bold">
                {performance.summary?.uniqueCustomers || 0}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 mb-1">Avg. Transaction</p>
              <p className="text-2xl font-bold">
                ₹{performance.summary?.averageTransactionValue?.toFixed(2) || '0.00'}
              </p>
            </Card>
          </div>
        )}

        {/* Recent Transactions */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No transactions yet today
            </p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium">{tx.studentName || 'Student'}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(tx.createdAt), 'h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₹{tx.amount.toFixed(2)}</p>
                    <Badge variant="success">{tx.mealType}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}



