import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployees, getSupabaseClient } from '@/lib/supabase';
import { upsertEmployee, EmployeePayload } from '@/services/vector-search';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employees = await getAllEmployees();

    return NextResponse.json({
      success: true,
      employees,
      data: employees,
      total: employees.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employees
 * Add a new employee manually
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, wallet_address, salary_usd, salary_annual, status } = body;

    // Validate required fields
    if (!name || !email || (!salary_usd && !salary_annual)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, email, and salary are required',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email address format',
        },
        { status: 400 }
      );
    }

    const finalSalary = salary_usd || salary_annual;

    // Validate salary
    if (isNaN(finalSalary) || finalSalary <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid salary amount',
        },
        { status: 400 }
      );
    }

    // Validate wallet address if provided
    if (wallet_address && !wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid wallet address format',
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Check if employee with this email already exists
    const { data: existing, error: checkError } = await supabase
      .from('employees')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'An employee with this email address already exists',
        },
        { status: 409 }
      );
    }

    // Insert new employee
    const { data: newEmployee, error: insertError } = await supabase
      .from('employees')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        wallet_address: wallet_address?.trim() || null,
        salary_usd: finalSalary,
        salary_annual: finalSalary,
        status: status || 'pending',
        pay_status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting employee:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to add employee to database',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    // Sync to Qdrant for semantic search (non-blocking)
    try {
      const employeePayload: EmployeePayload = {
        employeeId: newEmployee.id.toString(),
        name: newEmployee.name,
        email: newEmployee.email,
        role: newEmployee.role || 'Employee',
        department: newEmployee.department || 'General',
        skills: newEmployee.skills || [],
        walletAddress: newEmployee.wallet_address || undefined,
        text: `${newEmployee.name} ${newEmployee.email} ${newEmployee.role || ''} ${newEmployee.department || ''}`,
      };

      // Sync to vector database (don't await - fire and forget)
      upsertEmployee(employeePayload).catch((err) => {
        console.error('Failed to sync employee to Qdrant:', err);
      });
    } catch (syncError) {
      // Don't fail the request if vector sync fails
      console.error('Error syncing to Qdrant:', syncError);
    }

    return NextResponse.json({
      success: true,
      message: 'Employee added successfully',
      data: newEmployee,
    });
  } catch (error) {
    console.error('Error adding employee:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
