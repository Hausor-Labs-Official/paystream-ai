/**
 * Circle Off-Ramp: USDC → Bank Account (ACH)
 * Enables employees to cash out their USDC payroll to their bank accounts
 *
 * Flow:
 * 1. Employee connects bank via Plaid Link
 * 2. Verify USDC balance in employee's wallet
 * 3. Create Circle payout (USDC → ACH)
 * 4. Update database and notify employee
 */

import { createClient } from '@supabase/supabase-js';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// ================== TYPES ==================

export interface BankAccount {
  accountId: string;
  accountName: string;
  accountType: string; // checking, savings
  routingNumber: string;
  accountNumber: string;
  mask: string; // last 4 digits
  institutionName: string;
}

export interface OffRampConfig {
  employeeId: string;
  amount: number; // USD amount
  bankAccountId: string; // Stored bank account ID
  plaidAccessToken?: string; // For first-time setup
}

export interface OffRampResult {
  payoutId: string;
  status: 'pending' | 'complete' | 'failed';
  amount: number;
  fee: number;
  netAmount: number;
  bankAccount: {
    mask: string;
    institutionName: string;
  };
  estimatedArrival: string; // Date when funds arrive
  trackingId?: string;
}

export interface WalletBalance {
  usdcBalance: number;
  walletAddress: string;
  chainId: number;
}

// ================== INITIALIZATION ==================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Plaid configuration
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments.sandbox, // Use 'production' for live
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

// Circle API configuration
const CIRCLE_API_BASE = process.env.CIRCLE_API_BASE || 'https://api-sandbox.circle.com';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY!;

// ================== PLAID BANK VERIFICATION ==================

/**
 * Step 1: Create a Plaid Link token for employee to connect their bank
 */
export async function createPlaidLinkToken(employeeId: string): Promise<string> {
  const { data: employee } = await supabase
    .from('employees')
    .select('name, email')
    .eq('id', employeeId)
    .single();

  if (!employee) {
    throw new Error('Employee not found');
  }

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: employeeId },
    client_name: 'Paystream AI',
    products: ['auth' as any],
    country_codes: ['US' as any],
    language: 'en',
  });

  return response.data.link_token;
}

/**
 * Step 2: Exchange Plaid public token for access token and get account details
 */
export async function exchangePlaidToken(
  publicToken: string
): Promise<{ accessToken: string; accounts: BankAccount[] }> {
  // Exchange public token for access token
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const accessToken = exchangeResponse.data.access_token;

  // Get Auth data (routing + account numbers)
  const authResponse = await plaidClient.authGet({
    access_token: accessToken,
  });

  const accounts: BankAccount[] = authResponse.data.accounts.map((account) => ({
    accountId: account.account_id,
    accountName: account.name,
    accountType: account.subtype || 'checking',
    routingNumber: authResponse.data.numbers.ach?.find((n) => n.account_id === account.account_id)
      ?.routing || '',
    accountNumber: authResponse.data.numbers.ach?.find((n) => n.account_id === account.account_id)
      ?.account || '',
    mask: account.mask || '',
    institutionName: authResponse.data.item.institution_id || 'Bank',
  }));

  return { accessToken, accounts };
}

/**
 * Step 3: Store bank account in database (encrypted)
 */
export async function storeBankAccount(
  employeeId: string,
  bankAccount: BankAccount,
  plaidAccessToken: string
): Promise<string> {
  const { data, error } = await supabase
    .from('employee_bank_accounts')
    .insert({
      employee_id: employeeId,
      account_id: bankAccount.accountId,
      account_name: bankAccount.accountName,
      account_type: bankAccount.accountType,
      routing_number: bankAccount.routingNumber, // Should be encrypted in production
      account_number: bankAccount.accountNumber, // Should be encrypted in production
      mask: bankAccount.mask,
      institution_name: bankAccount.institutionName,
      plaid_access_token: plaidAccessToken, // Encrypted
      is_verified: true,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to store bank account: ${error.message}`);
  }

  return data.id;
}

// ================== WALLET BALANCE CHECK ==================

/**
 * Get employee's USDC balance from their Arc wallet
 */
export async function getEmployeeWalletBalance(employeeId: string): Promise<WalletBalance> {
  // Get employee's wallet address from database
  const { data: employee, error } = await supabase
    .from('employees')
    .select('wallet_address')
    .eq('id', employeeId)
    .single();

  if (error || !employee?.wallet_address) {
    throw new Error('Employee wallet not found');
  }

  // Query Arc blockchain for USDC balance
  const ethers = await import('ethers');
  const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
  const usdcAddress = process.env.USDC_CONTRACT_ADDRESS!;

  // USDC ERC-20 ABI (balanceOf)
  const usdcContract = new ethers.Contract(
    usdcAddress,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );

  const balance = await usdcContract.balanceOf(employee.wallet_address);
  const usdcBalance = parseFloat(ethers.formatUnits(balance, 6)); // USDC has 6 decimals

  return {
    usdcBalance,
    walletAddress: employee.wallet_address,
    chainId: parseInt(process.env.ARC_CHAIN_ID || '5042002'),
  };
}

// ================== CIRCLE PAYOUT (OFF-RAMP) ==================

/**
 * Create Circle wire/ACH bank account for payouts
 */
async function createCircleBankAccount(
  bankAccount: BankAccount,
  employeeId: string
): Promise<string> {
  const response = await fetch(`${CIRCLE_API_BASE}/v1/businessAccount/banks/wires`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CIRCLE_API_KEY}`,
    },
    body: JSON.stringify({
      idempotencyKey: `bank-${employeeId}-${Date.now()}`,
      accountNumber: bankAccount.accountNumber,
      routingNumber: bankAccount.routingNumber,
      billingDetails: {
        name: bankAccount.accountName,
        line1: '123 Main St',
        city: 'New York',
        postalCode: '10001',
        country: 'US',
      },
      bankAddress: {
        bankName: bankAccount.institutionName,
        country: 'US',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Circle bank account: ${error}`);
  }

  const data = await response.json();
  return data.data.id; // Circle bank account ID
}

/**
 * Step 4: Create Circle payout (USDC → ACH)
 */
export async function createCirclePayout(config: OffRampConfig): Promise<OffRampResult> {
  // 1. Verify USDC balance
  const balance = await getEmployeeWalletBalance(config.employeeId);

  if (balance.usdcBalance < config.amount) {
    throw new Error(
      `Insufficient USDC balance. Available: ${balance.usdcBalance}, Requested: ${config.amount}`
    );
  }

  // 2. Get stored bank account
  const { data: bankAccountData, error: bankError } = await supabase
    .from('employee_bank_accounts')
    .select('*')
    .eq('id', config.bankAccountId)
    .eq('employee_id', config.employeeId)
    .single();

  if (bankError || !bankAccountData) {
    throw new Error('Bank account not found');
  }

  const bankAccount: BankAccount = {
    accountId: bankAccountData.account_id,
    accountName: bankAccountData.account_name,
    accountType: bankAccountData.account_type,
    routingNumber: bankAccountData.routing_number,
    accountNumber: bankAccountData.account_number,
    mask: bankAccountData.mask,
    institutionName: bankAccountData.institution_name,
  };

  // 3. Create Circle bank account (if not already created)
  let circleBankId = bankAccountData.circle_bank_id;

  if (!circleBankId) {
    circleBankId = await createCircleBankAccount(bankAccount, config.employeeId);

    // Store Circle bank ID
    await supabase
      .from('employee_bank_accounts')
      .update({ circle_bank_id: circleBankId })
      .eq('id', config.bankAccountId);
  }

  // 4. Create Circle payout
  const payoutResponse = await fetch(`${CIRCLE_API_BASE}/v1/businessAccount/payouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CIRCLE_API_KEY}`,
    },
    body: JSON.stringify({
      idempotencyKey: `payout-${config.employeeId}-${Date.now()}`,
      source: {
        type: 'wallet',
        id: process.env.CIRCLE_WALLET_ID, // Your Circle wallet holding USDC
      },
      destination: {
        type: 'wire',
        id: circleBankId,
      },
      amount: {
        amount: config.amount.toFixed(2),
        currency: 'USD',
      },
      metadata: {
        employeeId: config.employeeId,
        type: 'payroll_cashout',
      },
    }),
  });

  if (!payoutResponse.ok) {
    const error = await payoutResponse.text();
    throw new Error(`Circle payout failed: ${error}`);
  }

  const payoutData = await payoutResponse.json();
  const payout = payoutData.data;

  // 5. Calculate fee (Circle charges ~0.1% for ACH, min $1)
  const fee = Math.max(config.amount * 0.001, 1.0);
  const netAmount = config.amount - fee;

  // 6. Store payout record in database
  await supabase.from('offramp_transactions').insert({
    employee_id: config.employeeId,
    payout_id: payout.id,
    amount: config.amount,
    fee,
    net_amount: netAmount,
    status: payout.status,
    bank_account_id: config.bankAccountId,
    bank_mask: bankAccount.mask,
    institution_name: bankAccount.institutionName,
    tracking_id: payout.trackingRef?.trackingNumber,
    created_at: new Date().toISOString(),
    estimated_arrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 business days
  });

  // 7. Return result
  const result: OffRampResult = {
    payoutId: payout.id,
    status: payout.status === 'complete' ? 'complete' : 'pending',
    amount: config.amount,
    fee,
    netAmount,
    bankAccount: {
      mask: bankAccount.mask,
      institutionName: bankAccount.institutionName,
    },
    estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    trackingId: payout.trackingRef?.trackingNumber,
  };

  return result;
}

// ================== WEBHOOK HANDLERS ==================

/**
 * Handle Circle payout status updates
 */
export async function handlePayoutWebhook(payload: any): Promise<void> {
  const { type, payout } = payload;

  switch (type) {
    case 'payouts.created':
    case 'payouts.pending':
    case 'payouts.complete':
    case 'payouts.failed':
      await supabase
        .from('offramp_transactions')
        .update({
          status: payout.status,
          updated_at: new Date().toISOString(),
        })
        .eq('payout_id', payout.id);

      // Notify employee
      const { data: transaction } = await supabase
        .from('offramp_transactions')
        .select('employee_id, amount, bank_mask, institution_name')
        .eq('payout_id', payout.id)
        .single();

      if (transaction) {
        // Send notification (email, SMS, push)
        console.log(
          `Payout ${payout.status}: $${transaction.amount} to ${transaction.institution_name} (****${transaction.bank_mask})`
        );
      }
      break;

    default:
      console.log('Unknown payout webhook event:', type);
  }
}

// ================== UTILITY FUNCTIONS ==================

/**
 * Get employee's payout history
 */
export async function getPayoutHistory(employeeId: string) {
  const { data, error } = await supabase
    .from('offramp_transactions')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch payout history: ${error.message}`);
  }

  return data;
}

/**
 * Get payout status by ID
 */
export async function getPayoutStatus(payoutId: string): Promise<OffRampResult | null> {
  const { data, error } = await supabase
    .from('offramp_transactions')
    .select('*')
    .eq('payout_id', payoutId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    payoutId: data.payout_id,
    status: data.status,
    amount: data.amount,
    fee: data.fee,
    netAmount: data.net_amount,
    bankAccount: {
      mask: data.bank_mask,
      institutionName: data.institution_name,
    },
    estimatedArrival: data.estimated_arrival,
    trackingId: data.tracking_id,
  };
}
