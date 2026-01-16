'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Loading } from '@/components/shared/Loading';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (!user) {
      router.push('/student/login');
      return;
    }
    loadData();
  }, [user, period]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await api.getWalletSummary();
      setSummary(response);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock data for charts (replace with actual API data)
  const weeklyData = [
    { day: 'Mon', spent: 150, meals: 3 },
    { day: 'Tue', spent: 200, meals: 4 },
    { day: 'Wed', spent: 180, meals: 3 },
    { day: 'Thu', spent: 220, meals: 4 },
    { day: 'Fri', spent: 250, meals: 5 },
    { day: 'Sat', spent: 300, meals: 6 },
    { day: 'Sun', spent: 280, meals: 5 },
  ];

  const mealTypeData = [
    { type: 'Breakfast', count: 45, amount: 1350 },
    { type: 'Lunch', count: 60, amount: 4200 },
    { type: 'Dinner', count: 55, amount: 3850 },
    { type: 'Snacks', count: 30, amount: 1500 },
  ];

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
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
          <h1 className="text-xl font-bold">Spending Analytics</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Period Selector */}
        <div className="flex gap-2">
          <Button
            variant={period === 'week' ? 'primary' : 'secondary'}
            onClick={() => setPeriod('week')}
          >
            This Week
          </Button>
          <Button
            variant={period === 'month' ? 'primary' : 'secondary'}
            onClick={() => setPeriod('month')}
          >
            This Month
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <p className="text-sm text-gray-600 mb-1">Total Spent</p>
              <p className="text-2xl font-bold">
                ₹{summary.statistics.totalSpent.toFixed(2)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
              <p className="text-2xl font-bold">
                {summary.statistics.totalDebits}
              </p>
            </Card>
          </div>
        )}

        {/* Weekly Spending Chart */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Daily Spending</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="spent"
                stroke="#0ea5e9"
                strokeWidth={2}
                name="Amount (₹)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Meal Type Distribution */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Meal Type Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mealTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0ea5e9" name="Meal Count" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Meal Type Stats */}
        <div className="grid grid-cols-2 gap-4">
          {mealTypeData.map((item) => (
            <Card key={item.type} compact>
              <p className="text-sm text-gray-600 mb-1">{item.type}</p>
              <p className="text-xl font-bold">{item.count} meals</p>
              <p className="text-sm text-gray-500">₹{item.amount.toFixed(2)}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}



