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

export default function AuditLogsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');

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
    loadLogs();
  }, [user, offset, entityTypeFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const response = await api.getAuditLogs(
        100,
        offset,
        entityTypeFilter === 'all' ? undefined : entityTypeFilter
      );
      setLogs(response.logs || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const entityTypes = ['all', 'wallet', 'transaction', 'vendor', 'user'];

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
          <h1 className="text-2xl font-bold">Audit Logs</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {entityTypes.map((type) => (
            <Button
              key={type}
              variant={entityTypeFilter === type ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setEntityTypeFilter(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <Loading />
        ) : logs.length === 0 ? (
          <EmptyState
            title="No audit logs found"
            description="System activity will appear here"
          />
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log.id} compact>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="primary">{log.entityType}</Badge>
                      <Badge variant="gray">{log.action}</Badge>
                      <span className="text-sm text-gray-500">
                        {format(new Date(log.createdAt), 'MMM d, yyyy • h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 font-mono">
                      Entity ID: {log.entityId.slice(0, 8)}...
                    </p>
                    {log.userId && (
                      <p className="text-xs text-gray-500 mt-1">
                        User: {log.userId.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {logs.length >= 100 && (
          <div className="mt-6">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setOffset(offset + 100)}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}


