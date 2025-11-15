import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getAllEmployees } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    // Fetch employees
    const employees = await getAllEmployees();

    // Fetch all transactions including payments
    const [offrampRes, externalRes, onrampRes, paymentsRes] = await Promise.all([
      supabase.from('offramp_transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('external_transfers').select('*').order('created_at', { ascending: false }),
      supabase.from('onramp_transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
    ]);

    // Calculate employee stats
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.status === 'active' || e.status === 'paid').length;
    const totalPayroll = employees.reduce((sum, e) => sum + (e.salary_usd || 0), 0);
    const avgSalary = totalEmployees > 0 ? totalPayroll / totalEmployees : 0;

    // Calculate transaction stats
    const allTransactions = [
      ...(offrampRes.data || []),
      ...(externalRes.data || []),
      ...(onrampRes.data || []),
      ...(paymentsRes.data || []),
    ];

    const totalTransactions = allTransactions.length;
    const totalTransactionVolume = allTransactions.reduce((sum, t) => {
      const amount = parseFloat(t.amount || t.net_amount || t.amount_usd || 0);
      return sum + amount;
    }, 0);

    // Generate payroll time series data from actual payments
    const payrollData = [];
    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    // Group payments by date
    const paymentsByDate: { [key: string]: { amount: number; count: number } } = {};

    (paymentsRes.data || []).forEach((payment: any) => {
      const dateStr = new Date(payment.created_at).toISOString().split('T')[0];
      if (!paymentsByDate[dateStr]) {
        paymentsByDate[dateStr] = { amount: 0, count: 0 };
      }
      paymentsByDate[dateStr].amount += parseFloat(payment.amount || 0);
      paymentsByDate[dateStr].count += 1;
    });

    // Create daily data points for the last 6 months
    for (let i = 0; i < 180; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = paymentsByDate[dateStr] || { amount: 0, count: 0 };

      payrollData.push({
        date: dateStr,
        amount: Math.round(dayData.amount),
        employees: dayData.count,
      });
    }

    // Transaction distribution
    const transactionDistribution = [
      {
        name: 'Payroll Payments',
        value: (paymentsRes.data || []).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
        count: paymentsRes.data?.length || 0,
      },
      {
        name: 'External Transfers',
        value: (externalRes.data || []).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
        count: externalRes.data?.length || 0,
      },
      {
        name: 'Bank Withdrawals',
        value: (offrampRes.data || []).reduce((sum, t) => sum + parseFloat(t.net_amount || t.amount || 0), 0),
        count: offrampRes.data?.length || 0,
      },
      {
        name: 'USDC Purchases',
        value: (onrampRes.data || []).reduce((sum, t) => sum + parseFloat(t.amount_usd || 0), 0),
        count: onrampRes.data?.length || 0,
      },
    ].filter(item => item.count > 0); // Only show categories with transactions

    // Salary distribution
    const salaryRanges = [
      { range: '$0-$30k', min: 0, max: 30000, count: 0 },
      { range: '$30k-$50k', min: 30000, max: 50000, count: 0 },
      { range: '$50k-$70k', min: 50000, max: 70000, count: 0 },
      { range: '$70k-$90k', min: 70000, max: 90000, count: 0 },
      { range: '$90k+', min: 90000, max: Infinity, count: 0 },
    ];

    employees.forEach(emp => {
      const salary = emp.salary_usd || 0;
      const range = salaryRanges.find(r => salary >= r.min && salary < r.max);
      if (range) range.count++;
    });

    const employeeSalaryDistribution = salaryRanges
      .filter(r => r.count > 0)
      .map(({ range, count }) => ({ range, count }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalEmployees,
          activeEmployees,
          totalPayroll,
          avgSalary,
          totalTransactions,
          totalTransactionVolume,
        },
        payrollData,
        transactionDistribution,
        employeeSalaryDistribution,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
