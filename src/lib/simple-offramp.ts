/**
 * Simple Off-Ramp Alternative (No Circle Business Account Required)
 *
 * Strategy:
 * 1. Employee receives USDC in their Arc wallet
 * 2. Employee transfers USDC to their external wallet (MetaMask, Coinbase, etc.)
 * 3. Employee uses external service to cash out (Coinbase, Binance, etc.)
 *
 * This file provides:
 * - Transfer USDC to external wallet
 * - Integration guides for popular exchanges
 * - Tracking of external transfers
 */

import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ExternalTransfer {
  employeeId: string;
  amount: number;
  destinationAddress: string;
  destinationLabel?: string; // "Coinbase", "MetaMask", etc.
}

export interface TransferResult {
  transactionHash: string;
  amount: number;
  destinationAddress: string;
  status: 'pending' | 'confirmed';
  explorerUrl: string;
}

/**
 * Transfer USDC from employee's payroll wallet to their external wallet
 */
export async function transferToExternalWallet(
  config: ExternalTransfer
): Promise<TransferResult> {
  const { employeeId, amount, destinationAddress, destinationLabel } = config;

  // 1. Get employee's wallet private key (should be encrypted in production)
  const { data: employee, error } = await supabase
    .from('employees')
    .select('wallet_address, wallet_private_key')
    .eq('id', employeeId)
    .single();

  if (error || !employee) {
    throw new Error('Employee wallet not found');
  }

  // 2. Setup ethers provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
  const wallet = new ethers.Wallet(employee.wallet_private_key, provider);

  // 3. USDC contract on Arc
  const usdcAddress = process.env.USDC_CONTRACT_ADDRESS!;
  const usdcAbi = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
  ];
  const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, wallet);

  // 4. Check balance
  const balance = await usdcContract.balanceOf(employee.wallet_address);
  const balanceFormatted = parseFloat(ethers.formatUnits(balance, 6)); // USDC has 6 decimals

  if (balanceFormatted < amount) {
    throw new Error(
      `Insufficient balance. Available: ${balanceFormatted}, Requested: ${amount}`
    );
  }

  // 5. Validate destination address
  if (!ethers.isAddress(destinationAddress)) {
    throw new Error('Invalid destination address');
  }

  // 6. Execute transfer
  const amountInWei = ethers.parseUnits(amount.toString(), 6);
  const tx = await usdcContract.transfer(destinationAddress, amountInWei);

  // 7. Save to database
  await supabase.from('external_transfers').insert({
    employee_id: employeeId,
    amount,
    destination_address: destinationAddress,
    destination_label: destinationLabel || 'External Wallet',
    transaction_hash: tx.hash,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  // 8. Return result
  const explorerUrl = `https://testnet.arcscan.app/tx/${tx.hash}`;

  return {
    transactionHash: tx.hash,
    amount,
    destinationAddress,
    status: 'pending',
    explorerUrl,
  };
}

/**
 * Get popular exchange deposit addresses for quick setup
 */
export function getExchangeGuides() {
  return {
    coinbase: {
      name: 'Coinbase',
      steps: [
        'Open Coinbase app/website',
        'Go to Assets → USDC',
        'Click "Receive"',
        'Select "Arbitrum" or "Polygon" network',
        'Copy your deposit address',
        'Paste it in Paystream AI',
        'Transfer and sell USDC for USD',
        'Withdraw USD to your bank (instant)',
      ],
      fees: '~0.5% trading fee, instant bank transfer',
      time: '< 1 hour total',
    },
    binance: {
      name: 'Binance',
      steps: [
        'Open Binance app/website',
        'Go to Wallet → Fiat and Spot',
        'Find USDC → Deposit',
        'Select network (Arbitrum/Polygon)',
        'Copy deposit address',
        'Transfer from Paystream AI',
        'Trade USDC → USD',
        'Withdraw to bank via ACH',
      ],
      fees: '~0.1% trading fee, ACH withdrawal',
      time: '1-3 business days',
    },
    kraken: {
      name: 'Kraken',
      steps: [
        'Login to Kraken',
        'Navigate to Funding',
        'Search for USDC',
        'Click Deposit',
        'Select network',
        'Copy address and transfer',
        'Sell USDC for USD',
        'Withdraw via wire/ACH',
      ],
      fees: '~0.2% trading fee',
      time: '1-3 business days',
    },
    metamask: {
      name: 'MetaMask (Bridge to Exchange)',
      steps: [
        'Open MetaMask',
        'Ensure you have Arc network added',
        'Copy your MetaMask address',
        'Transfer USDC from Paystream AI',
        'Bridge to Ethereum/Polygon if needed',
        'Send to exchange (Coinbase, etc.)',
        'Cash out from exchange',
      ],
      fees: 'Bridge fees + exchange fees',
      time: 'Varies by method',
    },
  };
}

/**
 * Get external transfer history for employee
 */
export async function getExternalTransferHistory(employeeId: string) {
  const { data, error } = await supabase
    .from('external_transfers')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch transfer history: ${error.message}`);
  }

  return data;
}

/**
 * Update transfer status (called by webhook or polling)
 */
export async function updateTransferStatus(
  transactionHash: string,
  status: 'confirmed' | 'failed'
) {
  await supabase
    .from('external_transfers')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('transaction_hash', transactionHash);
}

/**
 * Check if transaction is confirmed on blockchain
 */
export async function checkTransactionStatus(transactionHash: string): Promise<{
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
}> {
  const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);

  try {
    const receipt = await provider.getTransactionReceipt(transactionHash);

    if (!receipt) {
      return { status: 'pending', confirmations: 0 };
    }

    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;

    if (receipt.status === 0) {
      return { status: 'failed', confirmations };
    }

    return {
      status: confirmations >= 1 ? 'confirmed' : 'pending',
      confirmations,
    };
  } catch (error) {
    return { status: 'pending', confirmations: 0 };
  }
}
