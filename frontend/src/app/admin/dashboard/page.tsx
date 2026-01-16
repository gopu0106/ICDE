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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  
  const [overview, setOverview] = useState<any>(null);
  const [consumptionTrends, setConsumptionTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month'>('week');

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
  }, [user, dateRange]);

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

      const [overviewRes, trendsRes] = await Promise.all([
        api.getAnalyticsOverview(startDate),
        api.getConsumptionTrends(startDate),
      ]);

      setOverview(overviewRes);
      setConsumptionTrends(trendsRes.consumptionTrends || []);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    clearAuth();
    router.push('/admin/login');
  };

  if (isLoading) {
    return <Loading fullScreen />;
  }

  // Process data for charts
  const mealTypeData = consumptionTrends.reduce((acc: any, trend: any) => {
    if (!acc[trend.mealType]) {
      acc[trend.mealType] = { type: trend.mealType, count: 0, revenue: 0 };
    }
    acc[trend.mealType].count += trend.totalMeals;
    acc[trend.mealType].revenue += trend.totalRevenue;
    return acc;
  }, {});

  const pieData = Object.values(mealTypeData).map((item: any) => ({
    name: item.type,
    value: item.count,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">{user?.fullName}</p>
          </div>
          <div className="flex items-center gap-4">
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
            <Button variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <p className="text-sm text-gray-600 mb-1">Total Students</p>
              <p className="text-3xl font-bold">
                {overview.overview?.totalStudents?.toLocaleString() || 0}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 mb-1">Total Vendors</p>
              <p className="text-3xl font-bold">
                {overview.overview?.totalVendors || 0}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold">
                ₹{overview.overview?.totalRevenue?.toFixed(2) || '0.00'}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 mb-1">Wallet Balance</p>
              <p className="text-3xl font-bold">
                ₹{overview.overview?.totalWalletBalance?.toFixed(2) || '0.00'}
              </p>
            </Card>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Consumption Trends */}
          {consumptionTrends.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold mb-4">Meal Consumption Trends</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={consumptionTrends}>
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
                    name="Meals"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Meal Type Distribution */}
          {pieData.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold mb-4">Meal Type Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* Revenue Chart */}
        {consumptionTrends.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold mb-4">Daily Revenue</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={consumptionTrends}>
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/admin/analytics')}
            className="h-20"
          >
            <div className="text-center">
              <p className="font-semibold">View Analytics</p>
              <p className="text-sm text-gray-600">Detailed reports</p>
            </div>
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/admin/settlements')}
            className="h-20"
          >
            <div className="text-center">
              <p className="font-semibold">Settlements</p>
              <p className="text-sm text-gray-600">Vendor payments</p>
            </div>
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/admin/audit')}
            className="h-20"
          >
            <div className="text-center">
              <p className="font-semibold">Audit Logs</p>
              <p className="text-sm text-gray-600">System activity</p>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}


