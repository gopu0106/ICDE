'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Loading } from '@/components/shared/Loading';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function VendorSummaryPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [performance, setPerformance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'vendor') {
      router.push('/vendor/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const startDate = new Date(today.setHours(0, 0, 0, 0));
      
      const response = await api.getVendorPerformance(
        'vendor-id', // Would come from vendor context
        startDate
      );
      setPerformance(response);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading fullScreen />;
  }

  const dailyStats = performance?.dailyStats || [];

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
          <h1 className="text-2xl font-bold">Daily Summary</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        {performance?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold">
                ₹{performance.summary.totalRevenue.toFixed(2)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 mb-1">Transactions</p>
              <p className="text-2xl font-bold">
                {performance.summary.totalTransactions}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 mb-1">Customers</p>
              <p className="text-2xl font-bold">
                {performance.summary.uniqueCustomers}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 mb-1">Active Days</p>
              <p className="text-2xl font-bold">
                {performance.summary.activeDays}
              </p>
            </Card>
          </div>
        )}

        {/* Daily Revenue Chart */}
        {dailyStats.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold mb-4">Daily Revenue</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalRevenue" fill="#0ea5e9" name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Daily Stats Table */}
        {dailyStats.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold mb-4">Daily Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Transactions</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.map((stat: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm">{stat.date}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        ₹{stat.totalRevenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {stat.totalTransactions}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {stat.uniqueCustomers}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}



