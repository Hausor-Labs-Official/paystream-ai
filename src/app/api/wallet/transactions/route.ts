import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/wallet/transactions
 * Get wallet transaction history
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const transactions: any[] = [];

    // Fetch on-ramp transactions
    const { data: onrampData, error: onrampError } = await supabase
      .from('onramp_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!onrampError && onrampData) {
      onrampData.forEach((tx: any) => {
        transactions.push({
          id: tx.id || tx.session_id,
          type: 'onramp',
          amount: tx.amount_usd || 0,
          status: tx.status || 'pending',
          timestamp: tx.created_at || tx.completed_at || new Date().toISOString(),
          hash: tx.transaction_hash,
          description: `USDC purchase via Circle - $${tx.amount_usd?.toFixed(2) || 0}`,
        });
      });
    }

    // Fetch actual payment transactions from payments table
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*, employees(name, email)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!paymentsError && payments) {
      // Group payments by transaction hash to show batch payments as one entry
      const paymentsByTxHash: any = {};

      payments.forEach((payment: any) => {
        const txHash = payment.tx_hash;
        if (!paymentsByTxHash[txHash]) {
          paymentsByTxHash[txHash] = {
            payments: [],
            totalAmount: 0,
            timestamp: payment.created_at,
            status: payment.status,
            blockNumber: payment.block_number,
            gasUsed: payment.gas_used,
          };
        }
        paymentsByTxHash[txHash].payments.push(payment);
        paymentsByTxHash[txHash].totalAmount += parseFloat(payment.amount);
      });

      // Add grouped payments as transactions
      Object.keys(paymentsByTxHash).forEach((txHash) => {
        const group = paymentsByTxHash[txHash];
        const employeeNames = group.payments.map((p: any) => p.employees?.name || 'Unknown').join(', ');

        transactions.push({
          id: txHash || `payment-${group.timestamp}`,
          type: 'payroll',
          amount: -group.totalAmount, // Negative because it's outgoing
          status: group.status === 'confirmed' ? 'completed' : group.status,
          timestamp: group.timestamp,
          hash: txHash,
          description: `Payroll payment - ${group.payments.length} employee${group.payments.length > 1 ? 's' : ''} (${group.totalAmount.toFixed(2)} USDC)`,
        });
      });
    }

    // Sort all transactions by timestamp
    transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      transactions: transactions.slice(0, 20), // Return max 20 transactions
    });
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transactions',
        details: (error as Error).message,
        transactions: [], // Return empty array on error
      },
      { status: 500 }
    );
  }
}
