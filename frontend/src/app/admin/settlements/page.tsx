'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Input } from '@/components/shared/Input';
import { Loading } from '@/components/shared/Loading';
import { EmptyState } from '@/components/shared/EmptyState';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';
import { format } from 'date-fns';

export default function SettlementsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    vendorId: '',
    periodStart: '',
    periodEnd: '',
    commissionRate: '5',
  });

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
  }, [user]);

  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.createSettlement({
        vendorId: formData.vendorId,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
        commissionRate: parseFloat(formData.commissionRate),
      });
      setShowCreateForm(false);
      // Reload settlements
    } catch (error) {
      console.error('Failed to create settlement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkPaid = async (settlementId: string) => {
    const paymentRef = prompt('Enter payment reference:');
    if (!paymentRef) return;

    try {
      // This would need a backend endpoint
      // await api.markSettlementPaid(settlementId, paymentRef);
      alert('Settlement marked as paid');
    } catch (error) {
      console.error('Failed to mark settlement as paid:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
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
            <h1 className="text-2xl font-bold">Vendor Settlements</h1>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            Create Settlement
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {showCreateForm && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Create New Settlement</h2>
            <form onSubmit={handleCreateSettlement} className="space-y-4">
              <Input
                label="Vendor ID"
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Period Start"
                  type="date"
                  value={formData.periodStart}
                  onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                  required
                />
                <Input
                  label="Period End"
                  type="date"
                  value={formData.periodEnd}
                  onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Commission Rate (%)"
                type="number"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                min="0"
                max="100"
                step="0.01"
              />
              <div className="flex gap-2">
                <Button type="submit" isLoading={isLoading}>
                  Create
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {settlements.length === 0 ? (
          <EmptyState
            title="No settlements found"
            description="Create a new settlement to get started"
          />
        ) : (
          <div className="space-y-4">
            {settlements.map((settlement) => (
              <Card key={settlement.id}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {settlement.vendorName || 'Vendor'}
                      </h3>
                      <Badge
                        variant={
                          settlement.status === 'paid'
                            ? 'success'
                            : settlement.status === 'pending'
                            ? 'primary'
                            : 'gray'
                        }
                      >
                        {settlement.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {format(new Date(settlement.settlementPeriodStart), 'MMM d')} -{' '}
                      {format(new Date(settlement.settlementPeriodEnd), 'MMM d, yyyy')}
                    </p>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-600">Transactions</p>
                        <p className="font-semibold">{settlement.totalTransactions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="font-semibold">₹{settlement.totalAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Settlement</p>
                        <p className="font-semibold text-lg">
                          ₹{settlement.settlementAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-6">
                    {settlement.status === 'pending' && (
                      <Button
                        variant="success"
                        onClick={() => handleMarkPaid(settlement.id)}
                      >
                        Mark as Paid
                      </Button>
                    )}
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

