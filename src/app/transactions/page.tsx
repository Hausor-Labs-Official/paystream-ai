import { getSupabaseClient } from '@/lib/supabase';
import { TransactionDataTable } from '@/components/tables/TransactionDataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react';

async function getTransactions() {
  const supabase = getSupabaseClient();

  // Fetch all transaction types
  const [offrampRes, externalRes, onrampRes] = await Promise.all([
    supabase.from('offramp_transactions').select('*').order('created_at', { ascending: false }),
    supabase.from('external_transfers').select('*, employees(name)').order('created_at', { ascending: false }),
    supabase.from('onramp_transactions').select('*').order('created_at', { ascending: false }),
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all your payroll transactions in one place
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalVolume.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedTransactions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.completedTransactions / stats.totalTransactions) * 100).toFixed(1)}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingTransactions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting confirmation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
            <CardDescription>
              A comprehensive list of all payroll, bank transfers, and wallet transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionDataTable data={transactions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
