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

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month'>('month');

  useEffect(() => {
    if (!user) {
      router.push('/admin/login');
      return;
    }
    // Check for admin role (uppercase normalized from backend)
    const role = user.role?.toUpperCase();
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      router.push('/admin/login');
      return;
    }
    loadData();
  }, [user, dateRange, mealTypeFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      let startDate: string | undefined;
      
      if (dateRange === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString();
      } else {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString();
      }

      const response = await api.getConsumptionTrends(
        startDate,
        undefined,
        mealTypeFilter === 'all' ? undefined : mealTypeFilter
      );
      setTrends(response.consumptionTrends || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const mealTypes = ['all', 'breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
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
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-2">
            <Button
              variant={dateRange === 'week' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setDateRange('week')}
            >
              Week
            </Button>
            <Button
              variant={dateRange === 'month' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setDateRange('month')}
            >
              Month
            </Button>
          </div>
          <div className="flex gap-2">
            {mealTypes.map((type) => (
              <Button
                key={type}
                variant={mealTypeFilter === type ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setMealTypeFilter(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : (
          <>
            {/* Consumption Trends */}
            {trends.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold mb-4">Meal Consumption Trends</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="totalMeals"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      name="Total Meals"
                    />
                    <Line
                      type="monotone"
                      dataKey="uniqueStudents"
                      stroke="#22c55e"
                      strokeWidth={2}
                      name="Unique Students"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Revenue Trends */}
            {trends.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold mb-4">Revenue Trends</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={trends}>
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

            {/* Summary Table */}
            {trends.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold mb-4">Summary</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Meals</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Students</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Vendors</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trends.map((trend: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm">{trend.date}</td>
                          <td className="py-3 px-4 text-sm text-right">
                            {trend.totalMeals}
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            {trend.uniqueStudents}
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            {trend.uniqueVendors}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium">
                            ₹{trend.totalRevenue.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}


