import { NextRequest, NextResponse } from 'next/server';
import { getOpusClient } from '@/lib/opus-client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workflows/reviews/submit
 * Submit a review decision (approve or reject)
 *
 * Body: {
 *   reviewId: string,
 *   decision: 'approved' | 'rejected',
 *   reviewer: string,
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewId, decision, reviewer, notes } = body;

    // Validation
    if (!reviewId || typeof reviewId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Review ID is required',
        },
        { status: 400 }
      );
    }

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Decision must be either "approved" or "rejected"',
        },
        { status: 400 }
      );
    }

    if (!reviewer || typeof reviewer !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Reviewer email/ID is required',
        },
        { status: 400 }
      );
    }

    console.log('[Workflow Review Submit API] Submitting review:', {
      reviewId,
      decision,
      reviewer,
    });

    const opusClient = getOpusClient();
    // Map 'approved'/'rejected' to Opus decision format
    const opusDecision = decision === 'approved' ? ('approved' as const) : ('rejected' as const);
    const reviewNotes = notes || `Review by ${reviewer}`;
    await opusClient.submitReview(reviewId, opusDecision, reviewNotes);

    console.log('[Workflow Review Submit API] Review submitted successfully');

    return NextResponse.json({
      success: true,
      message: `Workflow ${decision} successfully`,
      reviewId,
      decision,
      reviewer,
    });
  } catch (error) {
    console.error('[Workflow Review Submit API] Error submitting review:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit review',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
