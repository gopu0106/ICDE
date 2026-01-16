'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { Loading } from '@/components/shared/Loading';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';

export default function VendorScanPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; transaction?: any } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanAreaRef = useRef<HTMLDivElement>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');

  useEffect(() => {
    if (!user || user.role !== 'vendor') {
      router.push('/vendor/login');
      return;
    }
    // Load menu items (would need vendorId)
    // loadMenuItems();
  }, [user]);

  const startScanning = async () => {
    if (!scanAreaRef.current) return;

    try {
      const scanner = new Html5Qrcode('vendor-scan-area');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },
        },
        (decodedText) => {
          handleStudentQR(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors
        }
      );

      setScanning(true);
    } catch (error) {
      console.error('Failed to start scanner:', error);
      setResult({
        success: false,
        message: 'Failed to access camera. Please check permissions.',
      });
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current = null;
          setScanning(false);
        })
        .catch((err) => {
          console.error('Failed to stop scanner:', err);
        });
    }
  };

  const handleStudentQR = async (qrCode: string) => {
    stopScanning();
    setProcessing(true);

    try {
      // Validate QR code
      const validation = await api.processMeal({
        studentQR: qrCode,
        vendorId: 'vendor-id', // Would come from vendor context
        menuItemId: selectedItem || menuItems[0]?.id,
      });

      setResult({
        success: true,
        message: `Transaction successful! ₹${validation.transaction.amount.toFixed(2)} deducted.`,
        transaction: validation.transaction,
      });

      // Reset after 3 seconds
      setTimeout(() => {
        setResult(null);
        setSelectedItem('');
        setProcessing(false);
      }, 3000);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.error || 'Transaction failed. Please try again.',
      });
      setProcessing(false);
    }
  };

  const handleManualSelect = async () => {
    if (!selectedItem) {
      setResult({
        success: false,
        message: 'Please select a menu item first',
      });
      return;
    }

    // For manual entry, we'd need student ID input
    // This is a simplified version
    setResult({
      success: false,
      message: 'Please scan student QR code',
    });
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <div className="mb-4">
            {result.success ? (
              <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-success-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-20 h-20 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-danger-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {result.success ? 'Success!' : 'Error'}
          </h2>
          <p className="text-gray-600 mb-2 text-lg">{result.message}</p>
          {result.transaction && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
              <p className="text-sm text-gray-600">Transaction ID</p>
              <p className="font-mono text-sm">{result.transaction.id.slice(0, 8)}...</p>
            </div>
          )}
          <Button
            fullWidth
            size="lg"
            className="mt-6"
            onClick={() => {
              setResult(null);
              setProcessing(false);
            }}
          >
            {result.success ? 'Scan Next' : 'Try Again'}
          </Button>
        </Card>
      </div>
    );
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
          <h1 className="text-2xl font-bold">Scan Student QR</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {!scanning ? (
          <div className="space-y-6">
            {/* Menu Item Selection */}
            {menuItems.length > 0 && (
              <Card>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Menu Item
                </label>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="input"
                >
                  <option value="">Select an item</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - ₹{item.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </Card>
            )}

            <Card className="text-center">
              <div className="mb-6">
                <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-16 h-16 text-primary-600"
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
                </div>
                <h2 className="text-2xl font-semibold mb-2">Scan Student QR Code</h2>
                <p className="text-gray-600">
                  Point camera at student's QR code to process payment
                </p>
              </div>
              <Button size="lg" fullWidth onClick={startScanning}>
                Start Scanning
              </Button>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              id="vendor-scan-area"
              ref={scanAreaRef}
              className="w-full rounded-lg overflow-hidden bg-black"
              style={{ minHeight: '500px' }}
            />
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="danger"
                fullWidth
                size="lg"
                onClick={stopScanning}
              >
                Stop Scanning
              </Button>
              <Button
                variant="secondary"
                fullWidth
                size="lg"
                onClick={handleManualSelect}
              >
                Manual Entry
              </Button>
            </div>
          </div>
        )}

        {processing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-sm">
              <Loading message="Processing transaction..." />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}



