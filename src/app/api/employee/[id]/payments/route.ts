import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/[id]/payments
 * Get payment history for a specific employee
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const employeeId = resolvedParams.id;

    const supabase = getSupabaseClient();

    // Fetch payment history for this employee
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch payments',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payments || [],
    });
  } catch (error) {
    console.error('Error in payments API:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
