'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';

export default function ScanQRPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/student/login');
      return;
    }
  }, [user]);

  const startScanning = async () => {
    if (!scanAreaRef.current) return;

    try {
      const scanner = new Html5Qrcode('scan-area');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleQRCode(decodedText);
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

  const handleQRCode = async (qrCode: string) => {
    stopScanning();

    try {
      // Parse QR code (assuming it contains vendor and menu item info)
      // In production, QR would contain vendorId and menuItemId
      const qrData = JSON.parse(qrCode);
      
      const response = await api.processMeal({
        counterQR: qrCode,
        vendorId: qrData.vendorId,
        menuItemId: qrData.menuItemId,
      });

      setResult({
        success: true,
        message: `Payment successful! ₹${response.transaction.amount.toFixed(2)} deducted.`,
      });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/student/dashboard');
      }, 2000);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.error || 'Payment failed. Please try again.',
      });
    }
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
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-success-600"
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
              <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-danger-600"
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
          <h2 className="text-xl font-semibold mb-2">
            {result.success ? 'Success!' : 'Error'}
          </h2>
          <p className="text-gray-600 mb-6">{result.message}</p>
          <Button
            fullWidth
            onClick={() => {
              setResult(null);
              router.push('/student/dashboard');
            }}
          >
            {result.success ? 'Back to Dashboard' : 'Try Again'}
          </Button>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold">Scan QR Code</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {!scanning ? (
          <Card className="text-center">
            <div className="mb-6">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-12 h-12 text-primary-600"
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
              <h2 className="text-xl font-semibold mb-2">Scan Counter QR</h2>
              <p className="text-gray-600">
                Point your camera at the vendor's QR code to pay
              </p>
            </div>
            <Button size="lg" fullWidth onClick={startScanning}>
              Start Scanning
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <div
              id="scan-area"
              ref={scanAreaRef}
              className="w-full rounded-lg overflow-hidden bg-black"
              style={{ minHeight: '400px' }}
            />
            <Button
              variant="danger"
              fullWidth
              size="lg"
              onClick={stopScanning}
            >
              Stop Scanning
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}



