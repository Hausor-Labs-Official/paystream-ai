import { NextResponse } from 'next/server';
import { generate } from '@/lib/gemini';
import CircleClient from '@/lib/circle';
import { getSupabaseClient } from '@/lib/supabase';
import { getProvider, getNetworkInfo } from '@/lib/arc';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    gemini: false,
    circle: false,
    arc: false,
    supabase: false,
    details: {} as Record<string, any>,
  };

  // Test Gemini AI
  try {
    const testResponse = await generate('Reply with only: OK');
    health.gemini = testResponse.toLowerCase().includes('ok');
    health.details.gemini = { working: health.gemini };
  } catch (error) {
    health.details.gemini = { error: (error as Error).message };
  }

  // Test Circle
  try {
    const circleClient = CircleClient.getInstance();
    const client = circleClient.getClient();

    // Test by listing wallet sets
    await client.listWalletSets({ pageSize: 1 });
    health.circle = true;
    health.details.circle = { working: true, walletSetId: process.env.WALLET_SET_ID };
  } catch (error) {
    health.details.circle = { error: (error as Error).message };
  }

  // Test Arc Testnet
  try {
    const provider = getProvider();
    const networkInfo = await getNetworkInfo();
    health.arc = networkInfo.chainId === 5042002; // Arc Testnet chain ID
    health.details.arc = {
      working: health.arc,
      chainId: networkInfo.chainId,
      blockNumber: networkInfo.blockNumber,
      rpcUrl: process.env.ARC_RPC_URL,
    };
  } catch (error) {
    health.details.arc = { error: (error as Error).message };
  }

  // Test Supabase
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('employees')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;

    health.supabase = true;
    health.details.supabase = {
      working: true,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    };
  } catch (error) {
    health.details.supabase = { error: (error as Error).message };
  }

  // Overall status
  health.status = health.gemini && health.circle && health.arc && health.supabase ? 'ok' : 'degraded';

  return NextResponse.json(health, { status: health.status === 'ok' ? 200 : 503 });
}
