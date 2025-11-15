import { getEmployeeById } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import EmployeeDashboard from '@/components/employee/EmployeeDashboard';

export const dynamic = 'force-dynamic';

interface EmployeePageProps {
  params: {
    id: string;
  };
}

export default async function EmployeePage({ params }: EmployeePageProps) {
  const resolvedParams = await params;
  const employeeId = parseInt(resolvedParams.id);

  if (isNaN(employeeId)) {
    redirect('/dashboard/employees');
  }

  const employee = await getEmployeeById(employeeId);

  if (!employee) {
    redirect('/dashboard/employees');
  }

  return <EmployeeDashboard employee={employee} />;
}
