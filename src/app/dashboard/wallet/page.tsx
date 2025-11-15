'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Wallet as WalletIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  ExternalLink,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';

interface WalletBalance {
  balance: number;
  address: string;
  currency: string;
  network: string;
}

interface Transaction {
  id: string;
  type: 'onramp' | 'payroll' | 'transfer';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  timestamp: string;
  hash?: string;
  description: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isLoadingTx, setIsLoadingTx] = useState(true);
  const [showOnRamp, setShowOnRamp] = useState(false);
  const [onRampAmount, setOnRampAmount] = useState('100');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Fetch wallet balance
  const fetchBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const response = await fetch('/api/balance');
      const data = await response.json();
      if (data.success) {
        setBalance(data);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Fetch transaction history from database
  const fetchTransactions = async () => {
    setIsLoadingTx(true);
    try {
      const response = await fetch('/api/wallet/transactions');
      const data = await response.json();

      if (data.success && data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoadingTx(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, []);

  const copyAddress = () => {
    if (balance?.address) {
      navigator.clipboard.writeText(balance.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleOnRamp = async () => {
    const amount = parseFloat(onRampAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsCreatingSession(true);
    try {
      const response = await fetch(`/api/onramp?amount=${amount}`);
      const data = await response.json();

      if (data.success && data.data.url) {
        // Open Circle on-ramp in new window
        window.open(data.data.url, '_blank', 'width=500,height=700');
        setShowOnRamp(false);
        // Refresh balance after a delay
        setTimeout(fetchBalance, 5000);
      } else {
        alert(`Failed to create on-ramp session: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-black mb-2">Wallet</h1>
        <p className="text-sm text-[#737E9C]">
          Manage your USDC wallet and view transaction history
        </p>
      </div>

      {/* Balance Card */}
      <Card className="mb-6 border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <WalletIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-black">USDC Balance</CardTitle>
                <CardDescription className="text-sm text-[#737E9C]">Arc Testnet</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBalance}
              disabled={isLoadingBalance}
              className="border-gray-200"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingBalance ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-[#737E9C]" />
            </div>
          ) : balance ? (
            <>
              <div className="mb-6">
                <p className="text-4xl font-semibold text-black mb-1">
                  ${balance.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-[#737E9C]">{balance.currency} on {balance.network}</p>
              </div>

              <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-[#737E9C] font-mono flex-1 truncate">
                  {balance.address}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="hover:bg-white"
                >
                  {copiedAddress ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#737E9C]" />
                  )}
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowOnRamp(true)}
                  className="flex-1 bg-[#0044FF] hover:bg-[#0033CC] text-white"
                >
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  Add Funds
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-gray-200"
                  disabled
                >
                  <ArrowUpFromLine className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-[#737E9C]">
              <p>Unable to load balance</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">
              ${transactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">
              ${Math.abs(transactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0)).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">{transactions.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-black">Transaction History</CardTitle>
          <CardDescription>Recent wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTx ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-[#737E9C]" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-[#737E9C]">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No transactions yet</p>
              <p className="text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="text-[#737E9C]">Type</TableHead>
                  <TableHead className="text-[#737E9C]">Description</TableHead>
                  <TableHead className="text-[#737E9C]">Amount</TableHead>
                  <TableHead className="text-[#737E9C]">Status</TableHead>
                  <TableHead className="text-[#737E9C]">Date</TableHead>
                  <TableHead className="text-[#737E9C]">Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-gray-200">
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${
                          tx.type === 'onramp' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          tx.type === 'payroll' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-black font-medium">
                      {tx.description}
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(tx.status)}
                        {getStatusBadge(tx.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-[#737E9C]">
                      {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      {tx.hash ? (
                        <a
                          href={`https://testnet.arcscan.app/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#0044FF] hover:underline text-sm"
                        >
                          {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-[#737E9C]">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* On-Ramp Modal */}
      {showOnRamp && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowOnRamp(false)}
        >
          <Card className="w-full max-w-md border-gray-200" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-black">
                Add Funds
              </CardTitle>
              <CardDescription>
                Purchase USDC using Circle's on-ramp. Funds will be sent directly to your wallet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-black mb-2 block">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  value={onRampAmount}
                  onChange={(e) => setOnRampAmount(e.target.value)}
                  placeholder="100"
                  min="10"
                  step="10"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-black focus:ring-2 focus:ring-[#0044FF] focus:border-[#0044FF] outline-none"
                />
                <p className="text-xs text-[#737E9C] mt-1">Minimum: $10</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-1">What happens next?</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• You'll be redirected to Circle's secure payment page</li>
                  <li>• Complete the payment using your preferred method</li>
                  <li>• USDC will be sent to your wallet within minutes</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowOnRamp(false)}
                  className="border-gray-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleOnRamp}
                  disabled={isCreatingSession}
                  className="bg-[#0044FF] hover:bg-[#0033CC] text-white"
                >
                  {isCreatingSession ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating Session...
                    </>
                  ) : (
                    'Continue to Payment'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
