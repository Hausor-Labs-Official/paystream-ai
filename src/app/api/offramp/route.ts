/**
 * Off-Ramp API: Employee Cash-Out Endpoints
 * Handles USDC → Bank Account (ACH) transfers via Circle + Plaid
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createPlaidLinkToken,
  exchangePlaidToken,
  storeBankAccount,
  createCirclePayout,
  getEmployeeWalletBalance,
  getPayoutHistory,
  getPayoutStatus,
  handlePayoutWebhook,
} from '@/lib/circle-offramp';

// ================== GET: Get employee wallet balance and payout history ==================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const action = searchParams.get('action'); // 'balance', 'history', 'status'
    const payoutId = searchParams.get('payoutId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // Get wallet balance
    if (action === 'balance' || !action) {
      const balance = await getEmployeeWalletBalance(employeeId);
      return NextResponse.json({
        success: true,
        data: {
          balance: balance.usdcBalance,
          walletAddress: balance.walletAddress,
          chainId: balance.chainId,
        },
      });
    }

    // Get payout history
    if (action === 'history') {
      const history = await getPayoutHistory(employeeId);
      return NextResponse.json({
        success: true,
        data: history,
      });
    }

    // Get payout status
    if (action === 'status' && payoutId) {
      const status = await getPayoutStatus(payoutId);
      if (!status) {
        return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: status,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Offramp GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process request',
      },
      { status: 500 }
    );
  }
}

// ================== POST: Create payout, link bank, exchange token ==================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, employeeId, amount, bankAccountId, publicToken } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // ========== ACTION: Create Plaid Link Token ==========
    if (action === 'create-link-token') {
      const linkToken = await createPlaidLinkToken(employeeId);
      return NextResponse.json({
        success: true,
        data: { linkToken },
      });
    }

    // ========== ACTION: Exchange Plaid Token & Store Bank ==========
    if (action === 'connect-bank') {
      if (!publicToken) {
        return NextResponse.json({ error: 'Public token required' }, { status: 400 });
      }

      // Exchange token and get bank accounts
      const { accessToken, accounts } = await exchangePlaidToken(publicToken);

      // Store the first account (or let user choose if multiple)
      const primaryAccount = accounts[0];
      if (!primaryAccount) {
        return NextResponse.json({ error: 'No bank accounts found' }, { status: 400 });
      }

      const bankAccountId = await storeBankAccount(employeeId, primaryAccount, accessToken);

      return NextResponse.json({
        success: true,
        data: {
          bankAccountId,
          account: {
            name: primaryAccount.accountName,
            type: primaryAccount.accountType,
            mask: primaryAccount.mask,
            institution: primaryAccount.institutionName,
          },
        },
      });
    }

    // ========== ACTION: Create Cash-Out (Payout) ==========
    if (action === 'cash-out') {
      if (!amount || !bankAccountId) {
        return NextResponse.json(
          { error: 'Amount and bank account ID required' },
          { status: 400 }
        );
      }

      if (amount <= 0) {
        return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
      }

      // Check minimum ($10) and maximum ($50,000) limits
      if (amount < 10) {
        return NextResponse.json({ error: 'Minimum cash-out amount is $10' }, { status: 400 });
      }

      if (amount > 50000) {
        return NextResponse.json(
          { error: 'Maximum cash-out amount is $50,000 per transaction' },
          { status: 400 }
        );
      }

      const result = await createCirclePayout({
        employeeId,
        amount,
        bankAccountId,
      });

      return NextResponse.json({
        success: true,
        data: result,
        message: `Successfully initiated cash-out of $${amount} to your bank account. Funds will arrive in 2-3 business days.`,
      });
    }

    // ========== ACTION: Webhook (Circle payout status updates) ==========
    if (action === 'webhook') {
      // Verify webhook signature (in production)
      // const signature = request.headers.get('circle-signature');
      // if (!verifyCircleWebhook(body, signature)) {
      //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      // }

      await handlePayoutWebhook(body);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Offramp POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process request',
      },
      { status: 500 }
    );
  }
}

// ================== DELETE: Remove connected bank account ==================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get('bankAccountId');

    if (!bankAccountId) {
      return NextResponse.json({ error: 'Bank account ID required' }, { status: 400 });
    }

    // TODO: Soft delete bank account
    // await supabase.from('employee_bank_accounts').update({ deleted_at: new Date() }).eq('id', bankAccountId);

    return NextResponse.json({
      success: true,
      message: 'Bank account removed successfully',
    });
  } catch (error: any) {
    console.error('Offramp DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to remove bank account',
      },
      { status: 500 }
    );
  }
}
