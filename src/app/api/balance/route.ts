import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

/**
 * GET /api/balance
 * Get deployer wallet balance on Arc Testnet
 */
export async function GET(request: NextRequest) {
  try {
    const privateKey = process.env.ETHER_PRIVATE_KEY;
    const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';

    if (!privateKey) {
      return NextResponse.json(
        { error: 'Wallet private key not configured' },
        { status: 500 }
      );
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Get native USDC balance (Arc uses USDC as native currency)
    const balance = await provider.getBalance(wallet.address);
    const balanceFormatted = parseFloat(ethers.formatEther(balance));

    return NextResponse.json({
      success: true,
      balance: balanceFormatted,
      address: wallet.address,
      currency: 'USDC',
      network: 'Arc Testnet',
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch balance',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
