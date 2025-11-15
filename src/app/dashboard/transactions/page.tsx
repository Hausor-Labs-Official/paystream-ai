import { getSupabaseClient } from '@/lib/supabase';
import { TransactionDataTable } from '@/components/tables/TransactionDataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react';

async function getTransactions() {
  const supabase = getSupabaseClient();

  // Fetch all transaction types including payments
  const [offrampRes, externalRes, onrampRes, paymentsRes] = await Promise.all([
    supabase.from('offramp_transactions').select('*').order('created_at', { ascending: false }),
    supabase.from('external_transfers').select('*, employees(name)').order('created_at', { ascending: false }),
    supabase.from('onramp_transactions').select('*').order('created_at', { ascending: false }),
    supabase.from('payments').select('*, employees(name, email)').order('created_at', { ascending: false }),
  ]);

  // Combine and normalize all transactions
  const transactions = [
    ...(offrampRes.data || []).map(t => ({
      id: t.id,
      type: 'offramp' as const,
      employee_name: undefined,
      amount: parseFloat(t.net_amount || t.amount),
      status: t.status === 'complete' ? 'complete' as const :
              t.status === 'pending' ? 'pending' as const : 'failed' as const,
      destination: t.institution_name || 'Bank Account',
      transaction_hash: t.tracking_id,
      created_at: t.created_at,
    })),
    ...(externalRes.data || []).map(t => ({
      id: t.id,
      type: 'external' as const,
      employee_name: t.employees?.name,
      amount: parseFloat(t.amount),
      status: t.status === 'confirmed' ? 'confirmed' as const :
              t.status === 'pending' ? 'pending' as const : 'failed' as const,
      destination: t.destination_label || t.destination_address,
      transaction_hash: t.transaction_hash,
      created_at: t.created_at,
    })),
    ...(onrampRes.data || []).map(t => ({
      id: t.session_id || t.id.toString(),
      type: 'onramp' as const,
      employee_name: undefined,
      amount: parseFloat(t.amount_usd || 0),
      status: t.status === 'complete' ? 'complete' as const : 'pending' as const,
      destination: 'Payroll Wallet',
      transaction_hash: t.transaction_hash,
      created_at: t.created_at,
    })),
    ...(paymentsRes.data || []).map(t => ({
      id: t.id,
      type: 'payroll' as const,
      employee_name: t.employees?.name,
      amount: parseFloat(t.amount),
      status: t.status === 'confirmed' ? 'confirmed' as const :
              t.status === 'pending' ? 'pending' as const : 'failed' as const,
      destination: `${t.employees?.name || 'Employee'} (${t.currency || 'USDC'})`,
      transaction_hash: t.tx_hash,
      created_at: t.created_at,
    })),
  ];

  // Sort by date descending
  transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Calculate statistics
  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
  const completedTransactions = transactions.filter(
    t => t.status === 'complete' || t.status === 'confirmed'
  ).length;
  const pendingTransactions = transactions.filter(t => t.status === 'pending').length;
  const totalTransactions = transactions.length;

  return {
    transactions,
    stats: {
      totalVolume,
      completedTransactions,
      pendingTransactions,
      totalTransactions,
    },
  };
}

export default async function TransactionsPage() {
  const { transactions, stats } = await getTransactions();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-black mb-2">Transaction History</h1>
        <p className="text-sm text-[#737E9C]">
          View and manage all your payroll transactions in one place
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">${stats.totalVolume.toLocaleString()}</p>
            <p className="text-xs text-[#737E9C] mt-1">
              Across all transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">{stats.totalTransactions}</p>
            <p className="text-xs text-[#737E9C] mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-green-600">{stats.completedTransactions}</p>
            <p className="text-xs text-[#737E9C] mt-1">
              {stats.totalTransactions > 0 ? ((stats.completedTransactions / stats.totalTransactions) * 100).toFixed(1) : '0.0'}% success rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-yellow-600">{stats.pendingTransactions}</p>
            <p className="text-xs text-[#737E9C] mt-1">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-black">All Transactions</CardTitle>
          <CardDescription>
            A comprehensive list of all payroll, bank transfers, and wallet transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionDataTable data={transactions} />
        </CardContent>
      </Card>
    </div>
  );
}
