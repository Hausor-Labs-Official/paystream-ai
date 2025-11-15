'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import OnRampButton from '@/components/onramp/OnRampButton';
import { Wallet, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export interface PayrollSummary {
  totalEmployees: number;
  totalNetPay: number;
  currentBalance: number;
  isBalanceSufficient: boolean;
}

export default function FundPayroll() {
  const [isLoading, setIsLoading] = useState(true);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [isExecutingPayroll, setIsExecutingPayroll] = useState(false);
  const [payrollResult, setPayrollResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch payroll summary and balance
   */
  const fetchPayrollSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch pending employees and calculate total
      const employeesResponse = await fetch('/api/employees?status=pending');
      if (!employeesResponse.ok) {
        throw new Error('Failed to fetch employees');
      }

      const employeesData = await employeesResponse.json();
      const employees = employeesData.data || [];

      // Calculate total net pay (simplified - in production, use PayrollAgent)
      let totalNetPay = 0;
      for (const emp of employees) {
        // Biweekly calculation: annual salary / 26
        const biweeklyGross = (emp.salary_usd || 0) / 26;
        // Simplified: 80 hours, 20% tax
        const netPay = biweeklyGross * 0.8;
        totalNetPay += netPay;
      }

      // Fetch deployer wallet balance
      const balanceResponse = await fetch('/api/balance');
      let currentBalance = 0;

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        currentBalance = balanceData.balance || 0;
      }

      setPayrollSummary({
        totalEmployees: employees.length,
        totalNetPay,
        currentBalance,
        isBalanceSufficient: currentBalance >= totalNetPay,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Execute payroll
   */
  const handleExecutePayroll = async () => {
    setIsExecutingPayroll(true);
    setError(null);
    setPayrollResult(null);

    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute payroll');
      }

      const result = await response.json();
      setPayrollResult(result.data);

      // Refresh summary after successful payroll
      setTimeout(() => {
        fetchPayrollSummary();
      }, 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsExecutingPayroll(false);
    }
  };

  /**
   * Handle successful funding
   */
  const handleFundingSuccess = () => {
    // Refresh balance and summary
    fetchPayrollSummary();

    // Auto-execute payroll if balance is now sufficient
    setTimeout(() => {
      if (payrollSummary?.isBalanceSufficient) {
        handleExecutePayroll();
      }
    }, 3000);
  };

  // Load data on mount
  useEffect(() => {
    fetchPayrollSummary();
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!payrollSummary) {
    return (
      <Card className="w-full">
        <CardContent className="py-12">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load payroll summary. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { totalEmployees, totalNetPay, currentBalance, isBalanceSufficient } = payrollSummary;
  const shortfall = Math.max(0, totalNetPay - currentBalance);

  return (
    <div className="space-y-6">
      {/* Payroll Summary Card */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Payroll Funding</CardTitle>
              <CardDescription>
                Manage payroll funding and execute batch payments
              </CardDescription>
            </div>
            <Badge
              variant={isBalanceSufficient ? 'default' : 'destructive'}
              className="text-sm px-3 py-1"
            >
              {isBalanceSufficient ? 'Ready' : 'Insufficient Funds'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Balance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total to Pay */}
            <div className="p-4 border border-gray-200 rounded-lg bg-white">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-gray-600">Total to Pay</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                ${totalNetPay.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalEmployees} employee{totalEmployees !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Current Balance */}
            <div className="p-4 border border-gray-200 rounded-lg bg-white">
              <div className="flex items-center space-x-2 mb-2">
                <Wallet className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-gray-600">Current Balance</p>
              </div>
              <p className="text-2xl font-bold text-green-900">
                ${currentBalance.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">USDC on Arc Testnet</p>
            </div>

            {/* Shortfall */}
            <div className="p-4 border border-gray-200 rounded-lg bg-white">
              <div className="flex items-center space-x-2 mb-2">
                {isBalanceSufficient ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <p className="text-sm font-medium text-gray-600">
                  {isBalanceSufficient ? 'Surplus' : 'Shortfall'}
                </p>
              </div>
              <p
                className={`text-2xl font-bold ${
                  isBalanceSufficient ? 'text-emerald-900' : 'text-red-900'
                }`}
              >
                ${isBalanceSufficient ? (currentBalance - totalNetPay).toFixed(2) : shortfall.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isBalanceSufficient ? 'Sufficient funds' : 'Need to fund'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            {/* Insufficient Balance Warning */}
            {!isBalanceSufficient && totalEmployees > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Insufficient balance to execute payroll. Please fund ${shortfall.toFixed(2)} USDC
                  to continue.
                </AlertDescription>
              </Alert>
            )}

            {/* No Employees Warning */}
            {totalEmployees === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No pending employees to pay. Please onboard employees first.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Fund with Card Button */}
              {!isBalanceSufficient && totalEmployees > 0 && (
                <div className="flex-1">
                  <OnRampButton
                    amount={Math.ceil(shortfall * 1.1)} // Add 10% buffer
                    onSuccess={handleFundingSuccess}
                    onError={(err) => setError(err)}
                    className="w-full"
                  />
                </div>
              )}

              {/* Execute Payroll Button - Connected to AI Agents */}
              {isBalanceSufficient && totalEmployees > 0 && (
                <Button
                  onClick={handleExecutePayroll}
                  disabled={isExecutingPayroll}
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isExecutingPayroll ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI Processing Payroll...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Execute Payroll with AI
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Display */}
            {payrollResult && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <p className="font-semibold">Payroll Executed Successfully!</p>
                  <p className="text-sm mt-1">
                    Paid {payrollResult.employeeCount} employees • Total: $
                    {payrollResult.totalPaid?.toFixed(2)}
                  </p>
                  <a
                    href={payrollResult.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-700 underline mt-1 inline-block"
                  >
                    View on Arc Explorer →
                  </a>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How AI-Powered Payroll Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="font-semibold text-primary">1.</span>
            <p>AI Payroll Agent calculates total payroll with tax deductions for pending employees</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold text-primary">2.</span>
            <p>If balance is insufficient, fund instantly with credit card using Circle On-Ramp</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold text-primary">3.</span>
            <p>AI Executor Agent processes batch payment to all employees in a single blockchain transaction</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold text-primary">4.</span>
            <p>Employees receive USDC directly to their Arc wallets instantly</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold text-primary">5.</span>
            <p>Penny AI Assistant monitors and provides real-time insights throughout the process</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
