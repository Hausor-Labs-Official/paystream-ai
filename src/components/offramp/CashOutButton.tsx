'use client';

/**
 * Cash-Out Button Component
 * Allows employees to withdraw USDC to their bank account
 * Integrates with Plaid Link for bank verification and Circle for payouts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wallet,
  Clock,
} from 'lucide-react';

interface CashOutButtonProps {
  employeeId: string;
  currentBalance?: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface BankAccount {
  id: string;
  name: string;
  type: string;
  mask: string;
  institution: string;
}

interface PayoutStatus {
  payoutId: string;
  status: 'pending' | 'complete' | 'failed';
  amount: number;
  fee: number;
  netAmount: number;
  estimatedArrival: string;
}

export default function CashOutButton({
  employeeId,
  currentBalance,
  onSuccess,
  onError,
}: CashOutButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'select' | 'amount' | 'confirm' | 'processing' | 'success'>('select');
  const [balance, setBalance] = useState<number>(currentBalance || 0);
  const [amount, setAmount] = useState<string>('');
  const [connectedBank, setConnectedBank] = useState<BankAccount | null>(null);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load Plaid Link script
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Plaid) {
      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch employee balance on mount
  useEffect(() => {
    if (!currentBalance) {
      fetchBalance();
    }
  }, [currentBalance]);

  const fetchBalance = async () => {
    try {
      const response = await fetch(`/api/offramp?employeeId=${employeeId}&action=balance`);
      const data = await response.json();
      if (data.success) {
        setBalance(data.data.balance);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  // Open Plaid Link to connect bank account
  const openPlaidLink = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      // 1. Get Plaid Link token
      const tokenResponse = await fetch('/api/offramp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-link-token',
          employeeId,
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenData.success) {
        throw new Error(tokenData.error || 'Failed to create link token');
      }

      // 2. Initialize Plaid Link
      const handler = (window as any).Plaid.create({
        token: tokenData.data.linkToken,
        onSuccess: async (publicToken: string, metadata: any) => {
          // 3. Exchange token and store bank account
          const connectResponse = await fetch('/api/offramp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'connect-bank',
              employeeId,
              publicToken,
            }),
          });

          const connectData = await connectResponse.json();
          if (connectData.success) {
            setConnectedBank({
              id: connectData.data.bankAccountId,
              name: connectData.data.account.name,
              type: connectData.data.account.type,
              mask: connectData.data.account.mask,
              institution: connectData.data.account.institution,
            });
            setStep('amount');
          } else {
            throw new Error(connectData.error || 'Failed to connect bank');
          }
        },
        onExit: (err: any, metadata: any) => {
          if (err != null) {
            setError('Failed to connect bank account. Please try again.');
          }
          setIsLoading(false);
        },
      });

      handler.open();
    } catch (err: any) {
      setError(err.message || 'Failed to connect bank account');
      if (onError) onError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, onError]);

  // Process cash-out
  const handleCashOut = async () => {
    if (!connectedBank || !amount) return;

    const cashOutAmount = parseFloat(amount);
    if (isNaN(cashOutAmount) || cashOutAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (cashOutAmount > balance) {
      setError('Insufficient balance');
      return;
    }

    if (cashOutAmount < 10) {
      setError('Minimum cash-out amount is $10');
      return;
    }

    setIsLoading(true);
    setError('');
    setStep('processing');

    try {
      const response = await fetch('/api/offramp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cash-out',
          employeeId,
          amount: cashOutAmount,
          bankAccountId: connectedBank.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPayoutStatus(data.data);
        setStep('success');
        if (onSuccess) onSuccess();
      } else {
        throw new Error(data.error || 'Cash-out failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process cash-out');
      setStep('confirm');
      if (onError) onError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setIsOpen(false);
    setStep('select');
    setAmount('');
    setError('');
    setTimeout(() => {
      setPayoutStatus(null);
    }, 300);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2"
        variant="default"
      >
        <DollarSign className="w-4 h-4" />
        Cash Out to Bank
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Cash Out to Bank</h2>
          <button
            onClick={resetModal}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Balance Display */}
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Available Balance</span>
          </div>
          <span className="text-xl font-bold text-blue-600">${balance.toFixed(2)}</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Step: Select or Connect Bank */}
        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Connect your bank account to cash out your USDC earnings. Funds typically arrive in 2-3 business days.
            </p>
            <Button
              onClick={openPlaidLink}
              disabled={isLoading}
              className="w-full gap-2"
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
              Connect Bank Account
            </Button>
          </div>
        )}

        {/* Step: Enter Amount */}
        {step === 'amount' && connectedBank && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {connectedBank.institution}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {connectedBank.type} ••••{connectedBank.mask}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Amount to Cash Out
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10 text-lg"
                  min="10"
                  max={balance}
                  step="0.01"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Minimum: $10.00</span>
                <button
                  onClick={() => setAmount(balance.toFixed(2))}
                  className="text-blue-600 hover:underline"
                >
                  Max: ${balance.toFixed(2)}
                </button>
              </div>
            </div>

            <Button
              onClick={() => setStep('confirm')}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
              className="w-full gap-2"
              size="lg"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && connectedBank && (
          <div className="space-y-4">
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Amount</span>
                <span className="font-medium">${parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Fee (est.)</span>
                <span className="font-medium">
                  ${Math.max(parseFloat(amount) * 0.001, 1).toFixed(2)}
                </span>
              </div>
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
              <div className="flex justify-between">
                <span className="font-medium">You'll Receive</span>
                <span className="text-lg font-bold text-green-600">
                  ${(parseFloat(amount) - Math.max(parseFloat(amount) * 0.001, 1)).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{connectedBank.institution}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Arrives in 2-3 business days</span>
              </div>
            </div>

            <Button
              onClick={handleCashOut}
              disabled={isLoading}
              className="w-full gap-2"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Confirm Cash Out
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="w-16 h-16 animate-spin mx-auto text-blue-600" />
            <h3 className="text-lg font-semibold">Processing Your Cash-Out...</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please wait while we process your request
            </p>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && payoutStatus && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Cash-Out Initiated!</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ${payoutStatus.netAmount.toFixed(2)} is on its way to your bank account
            </p>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Payout ID</span>
                <span className="font-mono text-xs">{payoutStatus.payoutId.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Status</span>
                <span className="text-yellow-600 font-medium capitalize">{payoutStatus.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Estimated Arrival</span>
                <span className="font-medium">
                  {new Date(payoutStatus.estimatedArrival).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Button onClick={resetModal} className="w-full" size="lg">
              Done
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
