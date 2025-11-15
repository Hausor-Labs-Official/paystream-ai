import { NextResponse } from 'next/server';
import { ExecutorAgent } from '@/lib/executor-agent';
import { getPendingEmployees } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/wallet/balance
 * Get USDC balance and payroll requirements
 */
export async function GET() {
  try {
    const executorAgent = new ExecutorAgent();

    // Get USDC balance from blockchain
    const balance = await executorAgent.getUSDCBalance();

    // Get wallet address
    const { getSigner } = await import('@/lib/arc');
    const signer = getSigner();
    const address = signer.address;

    // Get pending employees and calculate required payroll (for dashboard)
    const pendingEmployees = await getPendingEmployees();

    const estimatedPayroll = pendingEmployees.reduce((sum, emp) => {
      const annualSalary = emp.salary_usd || 52000;
      const biweeklyPay = annualSalary / 26;
      const estimatedNetPay = biweeklyPay * 0.75; // Rough estimate after taxes
      return sum + estimatedNetPay;
    }, 0);

    const hasSufficientBalance = balance >= estimatedPayroll;
    const shortfall = hasSufficientBalance ? 0 : estimatedPayroll - balance;

    // Return data in format expected by wallet page
    return NextResponse.json({
      success: true,
      balance: balance,
      address: address,
      currency: 'USDC',
      network: 'Arc Testnet',
      // Additional data for dashboard
      data: {
        balance,
        estimatedPayroll,
        hasSufficientBalance,
        shortfall,
        pendingEmployeeCount: pendingEmployees.length,
        percentageAvailable: estimatedPayroll > 0 ? (balance / estimatedPayroll) * 100 : 100,
      },
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch wallet balance',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
