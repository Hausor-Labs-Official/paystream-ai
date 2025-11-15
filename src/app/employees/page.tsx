import { getAllEmployees, Employee } from '@/lib/supabase';
import EmployeesClient from '@/components/employees/EmployeesClient';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  // Fetch employees from database
  let employees: Employee[] = [];

  try {
    employees = await getAllEmployees();
  } catch (error) {
    console.error('Error fetching employees:', error);
    employees = [];
  }

  return <EmployeesClient initialEmployees={employees} />;
}
