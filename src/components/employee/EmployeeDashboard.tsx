'use client';

import { useState, useEffect, useMemo } from 'react';
import { Employee } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Mail,
  Wallet,
  DollarSign,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  CreditCard,
  Briefcase,
} from 'lucide-react';

interface EmployeeDashboardProps {
  employee: Employee;
}

interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  tx_hash?: string;
}

export default function EmployeeDashboard({ employee }: EmployeeDashboardProps) {
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await fetch(`/api/employee/${employee.id}/payments`);
        const data = await response.json();

        if (data.success) {
          setPayments(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching payment history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [employee.id]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalEarned = payments
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const monthlySalary = (employee.salary_usd || 0) / 12;
    const biweeklySalary = (employee.salary_usd || 0) / 26;

    // Calculate next payment date (biweekly)
    const now = new Date();
    const nextPaymentDate = new Date(now);
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 14);

    return {
      totalEarned,
      pendingAmount,
      monthlySalary,
      biweeklySalary,
      nextPaymentDate,
    };
  }, [payments, employee.salary_usd]);

  // Payment history chart data (last 6 months) - using same approach as employer dashboard
  const earningsChartData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });

      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getMonth() === date.getMonth() &&
               paymentDate.getFullYear() === date.getFullYear() &&
               p.status === 'confirmed';
      });

      const totalAmount = monthPayments.reduce((sum, p) => sum + p.amount, 0);

      months.push({
        month: monthName,
        amount: totalAmount,
        count: monthPayments.length,
      });
    }

    return months;
  }, [payments]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      confirmed: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0044FF] to-[#0033CC] flex items-center justify-center text-white text-3xl font-semibold shadow-lg">
              {employee.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-black mb-2">Welcome back, {employee.name.split(' ')[0]}!</h1>
              <div className="flex items-center gap-4 flex-wrap mt-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{employee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm">Employee ID: {employee.id}</span>
                </div>
                {getStatusBadge(employee.status || 'pending')}
              </div>
            </div>

            {/* Quick Wallet Access */}
            {employee.wallet_address && (
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-[#0044FF]" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Your Wallet</p>
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {employee.wallet_address.slice(0, 8)}...{employee.wallet_address.slice(-6)}
                      </code>
                    </div>
                    <a
                      href={`https://testnet.arcscan.app/address/${employee.wallet_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0044FF] hover:text-[#0033CC]"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#0044FF]" />
                Annual Salary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-black mb-1">
                ${(employee.salary_usd || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                ${stats.monthlySalary.toLocaleString()} per month
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Total Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600 mb-1">
                ${stats.totalEarned.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {payments.filter(p => p.status === 'confirmed').length} payments received
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600 mb-1">
                ${stats.pendingAmount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {payments.filter(p => p.status === 'pending').length} pending payments
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0044FF]" />
                Next Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-black mb-1">
                ${stats.biweeklySalary.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.nextPaymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Chart */}
        <Card className="mb-8 border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black">Your Earnings</CardTitle>
            <CardDescription>Monthly earnings over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={earningsChartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0044FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0044FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  stroke="#9CA3AF"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#9CA3AF"
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => [`$${value.toFixed(2)}`, 'Earned']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#0044FF"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black">Recent Payments</CardTitle>
            <CardDescription>Your payment history and transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0044FF] mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading your payments...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-16">
                <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium text-lg mb-2">No payments yet</p>
                <p className="text-sm text-gray-400">Your payment history will appear here once processed</p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-gray-200">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 10)
                      .map((payment) => (
                        <TableRow key={payment.id} className="border-gray-200 hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <div>
                              <p className="text-sm text-black">
                                {new Date(payment.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(payment.created_at).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-base font-semibold text-black">
                              ${payment.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">USDC</p>
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            {payment.tx_hash ? (
                              <a
                                href={`https://testnet.arcscan.app/tx/${payment.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-[#0044FF] hover:underline"
                              >
                                <code className="text-xs font-mono">
                                  {payment.tx_hash.slice(0, 8)}...{payment.tx_hash.slice(-6)}
                                </code>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-gray-400 text-sm">Pending</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
