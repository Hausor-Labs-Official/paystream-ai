'use client';

/**
 * Simple Withdraw Button - No Circle Business Account Required
 * Allows employees to transfer USDC to external wallets (Coinbase, MetaMask, etc.)
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Send,
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface SimpleWithdrawButtonProps {
  employeeId: string;
  currentBalance?: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const POPULAR_EXCHANGES = [
  { label: 'Coinbase Wallet', value: 'coinbase' },
  { label: 'Binance', value: 'binance' },
  { label: 'Kraken', value: 'kraken' },
  { label: 'MetaMask', value: 'metamask' },
  { label: 'Custom Address', value: 'custom' },
];

export default function SimpleWithdrawButton({
  employeeId,
  currentBalance = 0,
  onSuccess,
  onError,
}: SimpleWithdrawButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'select' | 'amount' | 'guide' | 'confirm' | 'processing' | 'success'>('select');
  const [selectedExchange, setSelectedExchange] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [exchangeGuide, setExchangeGuide] = useState<any>(null);
  const [transferResult, setTransferResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch exchange guides
  useEffect(() => {
    if (selectedExchange && selectedExchange !== 'custom') {
      fetchExchangeGuide(selectedExchange);
    }
  }, [selectedExchange]);

  const fetchExchangeGuide = async (exchange: string) => {
    try {
      const response = await fetch('/api/simple-offramp?action=guides');
      const data = await response.json();
      if (data.success && data.data[exchange]) {
        setExchangeGuide(data.data[exchange]);
      }
    } catch (err) {
      console.error('Failed to fetch guide:', err);
    }
  };

  const handleExchangeSelect = (exchange: string) => {
    setSelectedExchange(exchange);
    if (exchange === 'custom') {
      setStep('amount');
    } else {
      setStep('guide');
    }
  };

  const handleContinueFromGuide = () => {
    setStep('amount');
  };

  const handleContinueToConfirm = () => {
    if (!destinationAddress || !amount) {
      setError('Please fill in all fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum > currentBalance) {
      setError('Insufficient balance');
      return;
    }

    setStep('confirm');
  };

  const handleTransfer = async () => {
    setIsLoading(true);
    setError('');
    setStep('processing');

    try {
      const response = await fetch('/api/simple-offramp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          amount: parseFloat(amount),
          destinationAddress,
          destinationLabel: POPULAR_EXCHANGES.find((e) => e.value === selectedExchange)?.label,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTransferResult(data.data);
        setStep('success');
        if (onSuccess) onSuccess();
      } else {
        throw new Error(data.error || 'Transfer failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to transfer USDC');
      setStep('confirm');
      if (onError) onError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetModal = () => {
    setIsOpen(false);
    setStep('select');
    setSelectedExchange('');
    setDestinationAddress('');
    setAmount('');
    setError('');
    setExchangeGuide(null);
    setTransferResult(null);
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="gap-2" variant="default">
        <Send className="w-4 h-4" />
        Withdraw to Wallet
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Withdraw USDC</h2>
          <button onClick={resetModal} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Available Balance</span>
          </div>
          <span className="text-xl font-bold text-blue-600">${currentBalance.toFixed(2)}</span>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Step: Select Exchange */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Transfer your USDC to an exchange or wallet, then cash out to your bank account.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Where do you want to send your USDC?</label>
              {POPULAR_EXCHANGES.map((exchange) => (
                <button
                  key={exchange.value}
                  onClick={() => handleExchangeSelect(exchange.value)}
                  className="w-full p-3 text-left border border-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {exchange.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Exchange Guide */}
        {step === 'guide' && exchangeGuide && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{exchangeGuide.name} Setup Guide</h3>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Time:</strong> {exchangeGuide.time}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Fees:</strong> {exchangeGuide.fees}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Steps:</p>
              <ol className="space-y-2">
                {exchangeGuide.steps.map((step: string, index: number) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                    <span className="font-semibold text-blue-600">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <Button onClick={handleContinueFromGuide} className="w-full gap-2" size="lg">
              Got It, Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step: Enter Amount & Address */}
        {step === 'amount' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Address</label>
              <Input
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="0x..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                {selectedExchange === 'custom'
                  ? 'Enter wallet or exchange address'
                  : `Get this from your ${POPULAR_EXCHANGES.find((e) => e.value === selectedExchange)?.label} account`}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (USDC)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 text-lg"
                  min="0"
                  max={currentBalance}
                  step="0.01"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Available: ${currentBalance.toFixed(2)}</span>
                <button
                  onClick={() => setAmount(currentBalance.toFixed(2))}
                  className="text-blue-600 hover:underline"
                >
                  Max
                </button>
              </div>
            </div>

            <Button
              onClick={handleContinueToConfirm}
              disabled={!destinationAddress || !amount}
              className="w-full gap-2"
              size="lg"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Amount</span>
                <span className="font-medium">${parseFloat(amount).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Network Fee</span>
                <span className="font-medium">~$0.10</span>
              </div>
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
              <div className="flex justify-between">
                <span className="font-medium">You'll Send</span>
                <span className="text-lg font-bold text-blue-600">
                  ${parseFloat(amount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs font-medium mb-1">Destination Address:</p>
              <p className="text-xs font-mono break-all">{destinationAddress}</p>
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> Make sure the address is correct. Transactions cannot be
                reversed.
              </p>
            </div>

            <Button onClick={handleTransfer} disabled={isLoading} className="w-full gap-2" size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Confirm Transfer
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="w-16 h-16 animate-spin mx-auto text-blue-600" />
            <h3 className="text-lg font-semibold">Processing Transfer...</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Broadcasting transaction to Arc network
            </p>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && transferResult && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Transfer Sent!</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ${transferResult.amount.toFixed(2)} USDC is on its way
            </p>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3 text-left">
              <div>
                <p className="text-xs text-gray-500 mb-1">Transaction Hash:</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono break-all flex-1">
                    {transferResult.transactionHash}
                  </p>
                  <button
                    onClick={() => handleCopy(transferResult.transactionHash)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <a
                href={transferResult.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                View on Block Explorer
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Next Steps:</strong>
                <br />
                1. Wait for transaction to confirm (~1-2 minutes)
                <br />
                2. Check your {POPULAR_EXCHANGES.find((e) => e.value === selectedExchange)?.label || 'wallet'} for the USDC
                <br />
                3. Sell USDC for USD and withdraw to your bank
              </p>
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
