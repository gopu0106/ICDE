'use client';

import React from 'react';
import { Card } from '../shared/Card';

interface WalletBalanceProps {
  balance: number;
  currency?: string;
}

export const WalletBalance: React.FC<WalletBalanceProps> = ({
  balance,
  currency = 'INR',
}) => {
  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white">
      <div className="space-y-2">
        <p className="text-primary-100 text-sm font-medium">Wallet Balance</p>
        <p className="text-4xl font-bold">{formatBalance(balance)}</p>
        <p className="text-primary-100 text-xs">
          Available for all campus dining
        </p>
      </div>
    </Card>
  );
};



