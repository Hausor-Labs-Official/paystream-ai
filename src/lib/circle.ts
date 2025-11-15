import { CircleDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { getEmployeeByEmail } from './supabase';

class CircleClient {
  private static instance: CircleClient;
  private client: CircleDeveloperControlledWalletsClient;

  private constructor() {
    if (!process.env.CIRCLE_API_KEY) {
      throw new Error('CIRCLE_API_KEY is not set in environment variables');
    }
    if (!process.env.CIRCLE_ENTITY_ID) {
      throw new Error('CIRCLE_ENTITY_ID is not set in environment variables');
    }

    this.client = new CircleDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_ID,
    });
  }

  public static getInstance(): CircleClient {
    if (!CircleClient.instance) {
      CircleClient.instance = new CircleClient();
    }
    return CircleClient.instance;
  }

  public getClient(): CircleDeveloperControlledWalletsClient {
    return this.client;
  }
}

export async function createEmployeeWallet(
  email: string
): Promise<{ walletId: string; address: string }> {
  try {
    // Check if wallet already exists in database (idempotent)
    const existingEmployee = await getEmployeeByEmail(email);
    if (existingEmployee && existingEmployee.wallet_id && existingEmployee.wallet_address) {
      console.log(`Wallet already exists for ${email}`);
      return {
        walletId: existingEmployee.wallet_id,
        address: existingEmployee.wallet_address,
      };
    }

    // Validate wallet set ID
    if (!process.env.WALLET_SET_ID) {
      throw new Error('WALLET_SET_ID is not set in environment variables');
    }

    // Create new wallet on Arc Testnet
    const client = CircleClient.getInstance().getClient();
    const response = await client.createWallets({
      accountType: 'SCA', // Smart Contract Account
      blockchains: ['ARC-TESTNET'],
      count: 1,
      walletSetId: process.env.WALLET_SET_ID,
      metadata: [
        {
          name: `Paystream Wallet - ${email}`,
          refId: email,
        },
      ],
    });

    if (!response.data?.wallets || response.data.wallets.length === 0) {
      throw new Error('Failed to create wallet: No wallet returned');
    }

    const wallet = response.data.wallets[0];

    console.log(`Created wallet for ${email}: ${wallet.address}`);

    return {
      walletId: wallet.id,
      address: wallet.address,
    };
  } catch (error) {
    console.error('Error creating employee wallet:', error);
    throw new Error(`Failed to create wallet for ${email}: ${(error as Error).message}`);
  }
}

export async function getWalletBalance(walletId: string): Promise<number> {
  try {
    const client = CircleClient.getInstance().getClient();
    const response = await client.getWalletTokenBalance({
      id: walletId,
    });

    if (!response.data?.tokenBalances) {
      return 0;
    }

    // Find USDC balance
    const usdcBalance = response.data.tokenBalances.find(
      (balance) => balance.token?.symbol === 'USDC'
    );

    return usdcBalance ? parseFloat(usdcBalance.amount || '0') : 0;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return 0;
  }
}

export default CircleClient;
