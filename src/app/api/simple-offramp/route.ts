/**
 * Simple Off-Ramp API (No Circle Business Account Required)
 * Transfers USDC to employee's external wallet (MetaMask, Coinbase, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  transferToExternalWallet,
  getExternalTransferHistory,
  checkTransactionStatus,
  updateTransferStatus,
  getExchangeGuides,
} from '@/lib/simple-offramp';

// GET: Get transfer history, transaction status, or exchange guides
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const employeeId = searchParams.get('employeeId');
    const txHash = searchParams.get('txHash');

    // Get exchange guides
    if (action === 'guides') {
      const guides = getExchangeGuides();
      return NextResponse.json({
        success: true,
        data: guides,
      });
    }

    // Get transfer history
    if (action === 'history' && employeeId) {
      const history = await getExternalTransferHistory(employeeId);
      return NextResponse.json({
        success: true,
        data: history,
      });
    }

    // Check transaction status
    if (action === 'status' && txHash) {
      const status = await checkTransactionStatus(txHash);
      return NextResponse.json({
        success: true,
        data: status,
      });
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('Simple offramp GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process request',
      },
      { status: 500 }
    );
  }
}

// POST: Transfer USDC to external wallet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, amount, destinationAddress, destinationLabel } = body;

    if (!employeeId || !amount || !destinationAddress) {
      return NextResponse.json(
        {
          error: 'Missing required fields: employeeId, amount, destinationAddress',
        },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    // Execute transfer
    const result = await transferToExternalWallet({
      employeeId,
      amount,
      destinationAddress,
      destinationLabel,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully transferred ${amount} USDC to ${destinationLabel || 'external wallet'}`,
    });
  } catch (error: any) {
    console.error('Simple offramp POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to transfer USDC',
      },
      { status: 500 }
    );
  }
}

// PATCH: Update transaction status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHash, status } = body;

    if (!txHash || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: txHash, status' },
        { status: 400 }
      );
    }

    await updateTransferStatus(txHash, status);

    return NextResponse.json({
      success: true,
      message: 'Transfer status updated',
    });
  } catch (error: any) {
    console.error('Simple offramp PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update status',
      },
      { status: 500 }
    );
  }
}
