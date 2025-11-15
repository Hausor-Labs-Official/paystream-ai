import { v4 as uuidv4 } from 'uuid';

/**
 * Circle W3S On-Ramp Integration
 * Generates signed URLs for fiat-to-crypto on-ramp
 */

export interface OnRampConfig {
  amount: number; // USD amount
  destinationWallet: string; // Blockchain wallet address
  blockchain?: string; // Default: 'ARB' (Arc uses Arbitrum-compatible chains)
  currency?: string; // Default: 'USDC'
}

export interface OnRampSession {
  sessionId: string;
  url: string;
  amount: number;
  destinationWallet: string;
  expiresAt: string;
}

const CIRCLE_API_BASE = 'https://api.circle.com/v1/w3s/onramp';
const CIRCLE_SANDBOX_API_BASE = 'https://api-sandbox.circle.com/v1/w3s/onramp';

/**
 * Get Circle API base URL based on environment
 */
function getApiBase(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? CIRCLE_API_BASE : CIRCLE_SANDBOX_API_BASE;
}

/**
 * Create a Circle On-Ramp session
 * @param config On-ramp configuration
 * @returns Session details with signed URL
 */
export async function createOnRampSession(config: OnRampConfig): Promise<OnRampSession> {
  const apiKey = process.env.CIRCLE_API_KEY;

  if (!apiKey) {
    throw new Error('CIRCLE_API_KEY not set in environment variables');
  }

  const sessionId = uuidv4();
  const blockchain = config.blockchain || 'ARB'; // Arc Testnet uses Arbitrum-compatible
  const currency = config.currency || 'USDC';

  try {
    // Create on-ramp session via Circle API
    const response = await fetch(`${getApiBase()}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        idempotencyKey: sessionId,
        amounts: {
          sourceCurrency: 'USD',
          targetCurrency: currency,
          sourceAmount: config.amount.toFixed(2),
        },
        destinationWallets: [
          {
            blockchain: blockchain,
            address: config.destinationWallet,
          },
        ],
        settlementMethod: 'blockchain', // Direct blockchain settlement
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?onramp=success`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Circle On-Ramp API error:', errorData);
      throw new Error(`Failed to create on-ramp session: ${response.statusText}`);
    }

    const data = await response.json();

    // Calculate expiration (Circle sessions typically expire in 30 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    return {
      sessionId: data.data.id || sessionId,
      url: data.data.hostedUrl || data.data.url,
      amount: config.amount,
      destinationWallet: config.destinationWallet,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    console.error('Error creating on-ramp session:', error);
    throw new Error(`On-ramp session creation failed: ${(error as Error).message}`);
  }
}

/**
 * Get on-ramp URL for funding payroll
 * @param totalUsd Total amount in USD to fund
 * @returns Signed on-ramp URL
 */
export async function getOnRampURL(totalUsd: number): Promise<string> {
  const deployerWallet = process.env.NEXT_PUBLIC_DEPLOYER_WALLET || process.env.ETHER_PRIVATE_KEY;

  if (!deployerWallet) {
    throw new Error('Deployer wallet not configured');
  }

  // If it's a private key, derive the address
  let walletAddress = deployerWallet;
  if (deployerWallet.startsWith('0x') && deployerWallet.length === 66) {
    // This is a private key, we need the address instead
    // In production, store the address separately
    walletAddress = '0xa94B845bBAB2ecef33067fbd59579A0cF71Cf434'; // Hardcoded deployer address
  }

  const session = await createOnRampSession({
    amount: totalUsd,
    destinationWallet: walletAddress,
    blockchain: 'ARB', // Arc Testnet
    currency: 'USDC',
  });

  return session.url;
}

/**
 * Verify Circle webhook signature
 * @param payload Webhook payload
 * @param signature Signature from Circle
 * @returns true if valid
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  // Circle uses HMAC-SHA256 for webhook signatures
  // In production, implement proper signature verification
  // For now, we'll do basic validation
  const webhookSecret = process.env.CIRCLE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('CIRCLE_WEBHOOK_SECRET not set, skipping signature verification');
    return true; // Allow in development
  }

  try {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = hmac.update(payload).digest('hex');
    return digest === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Parse Circle webhook event
 * @param payload Webhook payload
 * @returns Parsed event data
 */
export interface OnRampWebhookEvent {
  type: 'onramp.session.completed' | 'onramp.session.failed' | 'onramp.session.pending';
  sessionId: string;
  amount: number;
  currency: string;
  destinationWallet: string;
  transactionHash?: string;
  status: 'completed' | 'failed' | 'pending';
  timestamp: string;
}

export function parseWebhookEvent(payload: any): OnRampWebhookEvent {
  const event = payload.data || payload;

  return {
    type: payload.type || 'onramp.session.completed',
    sessionId: event.id || event.sessionId,
    amount: parseFloat(event.amount || event.targetAmount || '0'),
    currency: event.currency || 'USDC',
    destinationWallet: event.destinationWallet || event.walletAddress,
    transactionHash: event.transactionHash || event.txHash,
    status: event.status || 'completed',
    timestamp: event.timestamp || new Date().toISOString(),
  };
}

/**
 * Get on-ramp session status
 * @param sessionId Session ID
 * @returns Session status
 */
export async function getOnRampSessionStatus(sessionId: string): Promise<{
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  amount?: number;
}> {
  const apiKey = process.env.CIRCLE_API_KEY;

  if (!apiKey) {
    throw new Error('CIRCLE_API_KEY not set in environment variables');
  }

  try {
    const response = await fetch(`${getApiBase()}/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get session status: ${response.statusText}`);
    }

    const data = await response.json();
    const session = data.data;

    return {
      status: session.status || 'pending',
      transactionHash: session.transactionHash,
      amount: parseFloat(session.targetAmount || '0'),
    };
  } catch (error) {
    console.error('Error getting on-ramp session status:', error);
    throw new Error(`Failed to get session status: ${(error as Error).message}`);
  }
}
