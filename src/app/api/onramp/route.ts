import { NextRequest, NextResponse } from 'next/server';
import { getOnRampURL, verifyWebhookSignature, parseWebhookEvent } from '@/lib/circle-onramp';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/onramp
 * Generate signed on-ramp URL for funding payroll
 *
 * Query params:
 * - amount: USD amount to fund
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const amountParam = searchParams.get('amount');

    if (!amountParam) {
      return NextResponse.json(
        { error: 'Missing required parameter: amount' },
        { status: 400 }
      );
    }

    const amount = parseFloat(amountParam);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      );
    }

    // Generate on-ramp URL
    const url = await getOnRampURL(amount);

    return NextResponse.json({
      success: true,
      data: {
        url,
        amount,
        destinationWallet: '0xa94B845bBAB2ecef33067fbd59579A0cF71Cf434',
        message: 'On-ramp URL generated successfully',
      },
    });
  } catch (error) {
    console.error('Error generating on-ramp URL:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate on-ramp URL',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/onramp
 * Webhook endpoint for Circle on-ramp events
 *
 * Circle will POST here when:
 * - On-ramp session completes
 * - On-ramp session fails
 * - On-ramp transaction is pending
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-circle-signature') || '';

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    const event = parseWebhookEvent(payload);

    console.log('Circle On-Ramp Webhook:', {
      type: event.type,
      sessionId: event.sessionId,
      status: event.status,
      amount: event.amount,
    });

    // Handle different event types
    switch (event.type) {
      case 'onramp.session.completed':
        await handleOnRampCompleted(event);
        break;

      case 'onramp.session.failed':
        await handleOnRampFailed(event);
        break;

      case 'onramp.session.pending':
        await handleOnRampPending(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process webhook',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle completed on-ramp session
 */
async function handleOnRampCompleted(event: any) {
  console.log('On-ramp completed:', {
    sessionId: event.sessionId,
    amount: event.amount,
    txHash: event.transactionHash,
  });

  const supabase = getSupabaseClient();

  try {
    // Log the on-ramp transaction to database
    const { error: insertError } = await supabase
      .from('onramp_transactions')
      .insert({
        session_id: event.sessionId,
        amount_usd: event.amount,
        currency: event.currency,
        destination_wallet: event.destinationWallet,
        transaction_hash: event.transactionHash,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error logging on-ramp transaction:', insertError);
      // Don't throw - we still want to acknowledge the webhook
    }

    // Trigger automatic payroll execution
    // This will be picked up by the dashboard to refresh balance
    console.log('Funds received. Ready to execute payroll.');
  } catch (error) {
    console.error('Error handling completed on-ramp:', error);
  }
}

/**
 * Handle failed on-ramp session
 */
async function handleOnRampFailed(event: any) {
  console.log('On-ramp failed:', {
    sessionId: event.sessionId,
    amount: event.amount,
  });

  const supabase = getSupabaseClient();

  try {
    // Log the failed transaction
    const { error: insertError } = await supabase
      .from('onramp_transactions')
      .insert({
        session_id: event.sessionId,
        amount_usd: event.amount,
        currency: event.currency,
        destination_wallet: event.destinationWallet,
        status: 'failed',
        completed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error logging failed on-ramp:', insertError);
    }
  } catch (error) {
    console.error('Error handling failed on-ramp:', error);
  }
}

/**
 * Handle pending on-ramp session
 */
async function handleOnRampPending(event: any) {
  console.log('On-ramp pending:', {
    sessionId: event.sessionId,
    amount: event.amount,
  });

  const supabase = getSupabaseClient();

  try {
    // Log or update the pending transaction
    const { error: upsertError } = await supabase
      .from('onramp_transactions')
      .upsert({
        session_id: event.sessionId,
        amount_usd: event.amount,
        currency: event.currency,
        destination_wallet: event.destinationWallet,
        status: 'pending',
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('Error logging pending on-ramp:', upsertError);
    }
  } catch (error) {
    console.error('Error handling pending on-ramp:', error);
  }
}
