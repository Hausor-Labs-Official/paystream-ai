'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import OnRampButton from '@/components/onramp/OnRampButton';
import { Wallet, TrendingUp, AlertCircle, CheckCircle2, Loader2, DollarSign, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Employee } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AgentProcessModal from '@/components/agents/AgentProcessModal';

interface PayrollSummary {
  totalEmployees: number;
  totalNetPay: number;
  currentBalance: number;
  isBalanceSufficient: boolean;
}

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export default function PayRunsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [isExecutingPayroll, setIsExecutingPayroll] = useState(false);
  const [payrollResult, setPayrollResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);
  const [showAgentProcess, setShowAgentProcess] = useState(false);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);

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
      setPendingEmployees(employees);

      // Calculate total net pay
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

  const updateStepStatus = (stepId: string, status: ProcessStep['status']) => {
    setProcessSteps(prev =>
      prev.map(step => (step.id === stepId ? { ...step, status } : step))
    );
  };

  /**
   * Execute payroll using AI agents
   */
  const handleExecutePayroll = async () => {
    setIsExecutingPayroll(true);
    setError(null);
    setPayrollResult(null);

    // Initialize process steps
    const steps: ProcessStep[] = [
      {
        id: 'calculate',
        title: 'Calculating Payroll',
        description: 'Computing salaries, taxes, and net pay for all employees',
        status: 'processing',
      },
      {
        id: 'validate',
        title: 'Validating Balances',
        description: 'Checking wallet balance and transaction requirements',
        status: 'pending',
      },
      {
        id: 'execute',
        title: 'Executing Transactions',
        description: 'Processing blockchain payments to employee wallets',
        status: 'pending',
      },
      {
        id: 'notify',
        title: 'Sending Notifications',
        description: 'Emailing payment confirmations to employees',
        status: 'pending',
      },
    ];

    setProcessSteps(steps);
    setShowAgentProcess(true);

    try {
      // Step 1: Calculate payroll
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateStepStatus('calculate', 'completed');

      // Step 2: Validate balances
      updateStepStatus('validate', 'processing');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStepStatus('validate', 'completed');

      // Step 3: Execute transactions
      updateStepStatus('execute', 'processing');
      const response = await fetch('/api/payroll', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute payroll');
      }

      const result = await response.json();
      updateStepStatus('execute', 'completed');

      // Step 4: Send notifications
      updateStepStatus('notify', 'processing');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateStepStatus('notify', 'completed');

      setPayrollResult(result.data);
    } catch (err) {
      setError((err as Error).message);
      setShowAgentProcess(false);
      setIsExecutingPayroll(false);
    }
  };

  const handleProcessComplete = () => {
    setShowAgentProcess(false);
    setProcessSteps([]);
    setIsExecutingPayroll(false);
    // Refresh summary after successful payroll
    fetchPayrollSummary();
  };

  /**
   * Handle successful funding
   */
  const handleFundingSuccess = () => {
    // Refresh balance and summary
    fetchPayrollSummary();
  };

  // Load data on mount
  useEffect(() => {
    fetchPayrollSummary();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 bg-white min-h-screen">
        <Card className="w-full border-gray-200">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payrollSummary) {
    return (
      <div className="p-8 bg-white min-h-screen">
        <Card className="w-full border-gray-200">
          <CardContent className="py-12">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load payroll summary. Please try again.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { totalEmployees, totalNetPay, currentBalance, isBalanceSufficient } = payrollSummary;
  const shortfall = Math.max(0, totalNetPay - currentBalance);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black mb-2">Pay Run</h1>
            <p className="text-sm text-[#737E9C]">
              Manage and execute payroll with AI-powered automation
            </p>
          </div>
          <Badge
            variant={isBalanceSufficient ? 'default' : 'destructive'}
            className="text-sm px-3 py-1"
          >
            {isBalanceSufficient ? 'Ready to Process' : 'Insufficient Funds'}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Employees */}
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">{totalEmployees}</p>
            <p className="text-xs text-[#737E9C] mt-1">Pending payment</p>
          </CardContent>
        </Card>

        {/* Total to Pay */}
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total to Pay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">
              ${totalNetPay.toFixed(2)}
            </p>
            <p className="text-xs text-[#737E9C] mt-1">USDC required</p>
          </CardContent>
        </Card>

        {/* Current Balance */}
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">
              ${currentBalance.toFixed(2)}
            </p>
            <p className="text-xs text-[#737E9C] mt-1">USDC on Arc Testnet</p>
          </CardContent>
        </Card>

        {/* Shortfall/Surplus */}
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              {isBalanceSufficient ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {isBalanceSufficient ? 'Surplus' : 'Shortfall'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">
              ${isBalanceSufficient ? (currentBalance - totalNetPay).toFixed(2) : shortfall.toFixed(2)}
            </p>
            <p className="text-xs text-[#737E9C] mt-1">
              {isBalanceSufficient ? 'Sufficient funds' : 'Need to fund'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Employees Table */}
      {pendingEmployees.length > 0 && (
        <Card className="border-gray-200 mb-8">
          <CardHeader>
            <CardTitle>Pending Employees</CardTitle>
            <CardDescription>Employees scheduled for payment in this pay run</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead className="text-right">Salary (Annual)</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingEmployees.map((emp) => {
                  const biweeklyGross = (emp.salary_usd || 0) / 26;
                  const netPay = biweeklyGross * 0.8;
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {emp.wallet_address ? `${emp.wallet_address.slice(0, 6)}...${emp.wallet_address.slice(-4)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">${emp.salary_usd?.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">${netPay.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Actions Card */}
      <Card className="border-gray-200 mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Execute Pay Run</CardTitle>
          <CardDescription>
            Process payroll using AI-powered automation with blockchain settlement
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Insufficient Balance Warning */}
          {!isBalanceSufficient && totalEmployees > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Insufficient balance to execute payroll. Please fund ${shortfall.toFixed(2)} USDC to continue.
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
                  amount={Math.ceil(shortfall * 1.1)}
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
                    <DollarSign className="mr-2 h-4 w-4" />
                    Execute Pay Run with AI
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
                <p className="font-semibold">Pay Run Executed Successfully!</p>
                <p className="text-sm mt-1">
                  Paid {payrollResult.employeeCount} employees • Total: ${payrollResult.totalPaid?.toFixed(2)}
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
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">How AI-Powered Pay Runs Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="font-semibold text-primary">1.</span>
            <p>AI Payroll Agent calculates total payroll for pending employees with tax deductions</p>
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

      {/* Agent Process Modal */}
      <AgentProcessModal
        isOpen={showAgentProcess}
        title="Processing Payroll"
        steps={processSteps}
        onComplete={handleProcessComplete}
      />
    </div>
  );
}
