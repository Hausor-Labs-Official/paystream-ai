import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Employee interface
 * Note: Property names map to database columns as follows:
 * - wallet_id -> circle_wallet_id
 * - salary_usd -> salary_annual
 * - status -> pay_status
 */
export interface Employee {
  id?: number;
  email: string;
  name: string;
  wallet_id?: string;        // DB column: circle_wallet_id
  wallet_address?: string;
  salary_usd?: number;       // DB column: salary_annual
  status?: 'pending' | 'active' | 'paid' | 'inactive';  // DB column: pay_status
  created_at?: string;
  updated_at?: string;
}

class SupabaseClientSingleton {
  private static instance: SupabaseClient;

  private constructor() {}

  public static getInstance(): SupabaseClient {
    if (!SupabaseClientSingleton.instance) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials are not set in environment variables');
      }

      SupabaseClientSingleton.instance = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }

    return SupabaseClientSingleton.instance;
  }
}

export function getSupabaseClient(): SupabaseClient {
  return SupabaseClientSingleton.getInstance();
}

/**
 * Map database row to Employee interface
 */
function mapDbRowToEmployee(row: any): Employee {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    wallet_id: row.circle_wallet_id,
    wallet_address: row.wallet_address,
    salary_usd: row.salary_annual,
    status: row.pay_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function insertEmployee(data: Employee): Promise<Employee> {
  const supabase = getSupabaseClient();

  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .insert({
        email: data.email,
        name: data.name,
        circle_wallet_id: data.wallet_id,
        wallet_address: data.wallet_address,
        salary_annual: data.salary_usd,
        pay_status: data.status || 'pending',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapDbRowToEmployee(employee);
  } catch (error) {
    console.error('Error inserting employee:', error);
    throw new Error(`Failed to insert employee: ${(error as Error).message}`);
  }
}

export async function getPendingEmployees(): Promise<Employee[]> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('pay_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map(mapDbRowToEmployee);
  } catch (error) {
    console.error('Error getting pending employees:', error);
    throw new Error(`Failed to get pending employees: ${(error as Error).message}`);
  }
}

export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    return mapDbRowToEmployee(data);
  } catch (error) {
    console.error('Error getting employee by email:', error);
    return null;
  }
}

export async function updateEmployee(id: number, updates: Partial<Employee>): Promise<Employee> {
  const supabase = getSupabaseClient();

  try {
    // Map interface fields to database columns
    const dbUpdates: any = { ...updates };
    if (dbUpdates.wallet_id !== undefined) {
      dbUpdates.circle_wallet_id = dbUpdates.wallet_id;
      delete dbUpdates.wallet_id;
    }
    if (dbUpdates.salary_usd !== undefined) {
      dbUpdates.salary_annual = dbUpdates.salary_usd;
      delete dbUpdates.salary_usd;
    }
    if (dbUpdates.status !== undefined) {
      dbUpdates.pay_status = dbUpdates.status;
      delete dbUpdates.status;
    }

    const { data, error } = await supabase
      .from('employees')
      .update({
        ...dbUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapDbRowToEmployee(data);
  } catch (error) {
    console.error('Error updating employee:', error);
    throw new Error(`Failed to update employee: ${(error as Error).message}`);
  }
}

export async function getAllEmployees(): Promise<Employee[]> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(mapDbRowToEmployee);
  } catch (error) {
    console.error('Error getting all employees:', error);
    throw new Error(`Failed to get employees: ${(error as Error).message}`);
  }
}

export async function getEmployeeById(id: number): Promise<Employee | null> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return mapDbRowToEmployee(data);
  } catch (error) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting employee by ID:', error instanceof Error ? error.message : String(error));
    }
    return null;
  }
}

export async function deleteEmployee(id: number): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    // Delete related records first (transactions, payments, etc.)
    await supabase.from('external_transfers').delete().eq('employee_id', id);

    // Delete the employee
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw new Error(`Failed to delete employee: ${(error as Error).message}`);
  }
}

export default getSupabaseClient;
