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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  User,
  Mail,
  Wallet,
  DollarSign,
  Calendar,
  TrendingUp,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  ExternalLink,
  CreditCard,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EnhancedEmployeeDashboardProps {
  employee: Employee;
}

interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  tx_hash?: string;
}

export default function EnhancedEmployeeDashboard({ employee }: EnhancedEmployeeDashboardProps) {
  const router = useRouter();
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
    const totalPaid = payments
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const totalPayments = payments.length;
    const monthlySalary = (employee.salary_usd || 0) / 12;
    const biweeklySalary = (employee.salary_usd || 0) / 26;

    return { totalPaid, pendingPayments, totalPayments, monthlySalary, biweeklySalary };
  }, [payments, employee.salary_usd]);

  // Payment history chart data (last 6 months)
  const paymentChartData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

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

  // Payment status distribution
  const statusData = useMemo(() => {
    const confirmed = payments.filter(p => p.status === 'confirmed').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const failed = payments.filter(p => p.status === 'failed').length;

    return [
      { name: 'Confirmed', value: confirmed, color: '#10B981' },
      { name: 'Pending', value: pending, color: '#F59E0B' },
      { name: 'Failed', value: failed, color: '#EF4444' },
    ].filter(item => item.value > 0);
  }, [payments]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard/employees')}
        className="mb-6 hover:bg-white"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Employees
      </Button>

      {/* Employee Header */}
      <Card className="mb-8 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0044FF] to-[#0033CC] flex items-center justify-center text-white text-4xl font-semibold shadow-lg">
              {employee.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-semibold text-black mb-2">{employee.name}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{employee.email}</span>
                </div>
                {employee.wallet_address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Wallet className="w-4 h-4" />
                    <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {employee.wallet_address.slice(0, 6)}...{employee.wallet_address.slice(-4)}
                    </code>
                    <a
                      href={`https://testnet.arcscan.app/address/${employee.wallet_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0044FF] hover:text-[#0033CC]"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
                <Badge
                  className={
                    employee.status === 'active' || employee.status === 'paid'
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : employee.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      : 'bg-red-100 text-red-800 border-red-200'
                  }
                >
                  {employee.status || 'pending'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Annual Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">
              ${(employee.salary_usd || 0).toLocaleString()}
            </p>
            <p className="text-xs text-[#737E9C] mt-1">
              ${stats.monthlySalary.toLocaleString()} / month
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-green-600">
              ${stats.totalPaid.toFixed(2)}
            </p>
            <p className="text-xs text-[#737E9C] mt-1">
              {stats.totalPayments} payment{stats.totalPayments !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">{stats.pendingPayments}</p>
            <p className="text-xs text-[#737E9C] mt-1">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Next Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-black">
              ${stats.biweeklySalary.toFixed(2)}
            </p>
            <p className="text-xs text-[#737E9C] mt-1">Biweekly</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Payment History Chart */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-black">Payment History</CardTitle>
            <CardDescription>Your earnings over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={paymentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#0044FF"
                  strokeWidth={2}
                  dot={{ fill: '#0044FF', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Status Distribution */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-black">Payment Status</CardTitle>
            <CardDescription>Distribution of payment statuses</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">No payment data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History Table */}
      <Card className="border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Transactions</CardTitle>
              <CardDescription>Detailed history of all your payments</CardDescription>
            </div>
            <Button variant="outline" size="sm" disabled={payments.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0044FF] mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading transactions...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium text-lg mb-2">No payments yet</p>
              <p className="text-sm text-gray-400">Your payment history will appear here</p>
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
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="border-gray-200 hover:bg-gray-50">
                      <TableCell className="font-medium">
                        {new Date(payment.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(payment.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </TableCell>
                      <TableCell className="font-semibold text-black">
                        ${payment.amount.toFixed(2)} USDC
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          <Badge
                            className={
                              payment.status === 'confirmed'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : payment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }
                          >
                            {payment.status}
                          </Badge>
                        </div>
                      </TableCell>
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
                          <span className="text-gray-400 text-sm">-</span>
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
  );
}
