import { NextRequest, NextResponse } from 'next/server';
import { getOpusClient } from '@/lib/opus-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/reviews
 * Get all pending workflow reviews
 *
 * Query params:
 *   - workflowType?: string (optional filter)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowType = searchParams.get('workflowType') as any;

    console.log('[Workflow Reviews API] Fetching pending reviews', { workflowType });

    const opusClient = getOpusClient();
    const reviews = await opusClient.getPendingReviews(workflowType);

    console.log('[Workflow Reviews API] Found reviews:', reviews.length);

    return NextResponse.json({
      success: true,
      reviews,
      count: reviews.length,
    });
  } catch (error) {
    console.error('[Workflow Reviews API] Error fetching reviews:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pending reviews',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
