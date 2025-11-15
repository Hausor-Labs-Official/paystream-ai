import { getAllEmployees, Employee } from '@/lib/supabase';
import EnhancedDashboard from '@/components/dashboard/EnhancedDashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Fetch employees from Supabase
  let employees: Employee[] = [];

  try {
    employees = await getAllEmployees();
  } catch (error) {
    console.error('Error fetching employees:', error);
    // Return empty array if Supabase is not configured
    employees = [];
  }

  return <EnhancedDashboard initialEmployees={employees} />;
}
