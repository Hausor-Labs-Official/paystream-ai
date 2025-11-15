import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeById, deleteEmployee, updateEmployee } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employees/[id]
 * Get a specific employee by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const employeeId = parseInt(resolvedParams.id);

    if (isNaN(employeeId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid employee ID' },
        { status: 400 }
      );
    }

    const employee = await getEmployeeById(employeeId);

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch employee',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/employees/[id]
 * Delete an employee and revoke their access
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const employeeId = parseInt(resolvedParams.id);

    if (isNaN(employeeId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid employee ID' },
        { status: 400 }
      );
    }

    // Get employee details before deletion
    const employee = await getEmployeeById(employeeId);

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Delete the employee (this will cascade delete related records)
    await deleteEmployee(employeeId);

    // TODO: Revoke Clerk access if employee has an account
    // This would require integrating with Clerk's User Management API
    // to delete or disable the user account associated with this email

    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully',
      data: {
        id: employeeId,
        name: employee.name,
        email: employee.email,
      },
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete employee',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/employees/[id]
 * Update an employee
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const employeeId = parseInt(resolvedParams.id);

    if (isNaN(employeeId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid employee ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updatedEmployee = await updateEmployee(employeeId, body);

    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee,
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update employee',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
