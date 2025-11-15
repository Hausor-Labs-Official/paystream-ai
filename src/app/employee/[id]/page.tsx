'use client';

/**
 * Employee Dashboard
 * Shows payroll history, USDC balance, and cash-out functionality
 */

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CashOutButton from '@/components/offramp/CashOutButton';
import {
  DollarSign,
  Wallet,
  TrendingUp,
  Clock,
  ArrowDownToLine,
  Building2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface EmployeeData {
  id: string;
  name: string;
  email: string;
  wallet_address: string;
  salary: number;
}

interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  transaction_hash?: string;
}

interface OffRampTransaction {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  created_at: string;
  bank_mask: string;
  institution_name: string;
  estimated_arrival: string;
}

export default function EmployeeDashboard({ params }: { params: { id: string } }) {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [offrampHistory, setOfframpHistory] = useState<OffRampTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeData();
    fetchBalance();
    fetchPaymentHistory();
    fetchOfframpHistory();
  }, [params.id]);

  const fetchEmployeeData = async () => {
    try {
      const response = await fetch(`/api/employees/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setEmployee(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await fetch(`/api/offramp?employeeId=${params.id}&action=balance`);
      const data = await response.json();
      if (data.success) {
        setBalance(data.data.balance);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch(`/api/payments?employeeId=${params.id}`);
      const data = await response.json();
      if (data.success) {
        setPaymentHistory(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
    }
  };

  const fetchOfframpHistory = async () => {
    try {
      const response = await fetch(`/api/offramp?employeeId=${params.id}&action=history`);
      const data = await response.json();
      if (data.success) {
        setOfframpHistory(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch offramp history:', error);
    }
  };

  const handleCashOutSuccess = () => {
    fetchBalance();
    fetchOfframpHistory();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee Not Found</h2>
          <p className="text-gray-600">The requested employee could not be found.</p>
        </div>
      </div>
    );
  }

  const totalEarnings = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
  const totalCashedOut = offrampHistory.reduce((sum, txn) => sum + txn.net_amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {employee.name}'s Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{employee.email}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* USDC Balance */}
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between mb-4">
              <Wallet className="w-8 h-8 opacity-80" />
              <span className="text-sm opacity-80">Available Balance</span>
            </div>
            <div className="text-3xl font-bold">${balance.toFixed(2)}</div>
            <p className="text-xs opacity-80 mt-2">USDC on Arc</p>
          </Card>

          {/* Total Earnings */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              ${totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-2">Lifetime</p>
          </Card>

          {/* Monthly Salary */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-purple-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Salary</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              ${employee.salary.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-2">Per month</p>
          </Card>

          {/* Cashed Out */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <ArrowDownToLine className="w-8 h-8 text-orange-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Cashed Out</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              ${totalCashedOut.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-2">To bank account</p>
          </Card>
        </div>

        {/* Cash Out Button */}
        <div className="mb-8 flex justify-center">
          <CashOutButton
            employeeId={params.id}
            currentBalance={balance}
            onSuccess={handleCashOutSuccess}
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment History */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Payment History
            </h2>
            <div className="space-y-3">
              {paymentHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No payments yet</p>
              ) : (
                paymentHistory.slice(0, 5).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          payment.status === 'completed'
                            ? 'bg-green-500'
                            : payment.status === 'pending'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          +${payment.amount.toFixed(2)} USDC
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        payment.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Cash-Out History */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Cash-Out History
            </h2>
            <div className="space-y-3">
              {offrampHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No cash-outs yet</p>
              ) : (
                offrampHistory.slice(0, 5).map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {txn.status === 'complete' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : txn.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          ${txn.net_amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {txn.institution_name} ••••{txn.bank_mask}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs px-2 py-1 rounded block mb-1 ${
                          txn.status === 'complete'
                            ? 'bg-green-100 text-green-700'
                            : txn.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {txn.status}
                      </span>
                      <p className="text-xs text-gray-500">
                        {new Date(txn.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
