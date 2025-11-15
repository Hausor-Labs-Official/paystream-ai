'use client';

import { useState, useMemo } from 'react';
import { Employee } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PayRunScheduler } from '@/components/payroll/PayRunScheduler';
import { EmployeeDataTable } from '@/components/tables/EmployeeDataTable';
import { InteractivePayrollChart } from '@/components/charts/InteractivePayrollChart';
import AgentMonitor from '@/components/agents/AgentMonitor';
import EmployeeEditDialog from '@/components/employees/EmployeeEditDialog';
import AddEmployeeDialog from '@/components/employees/AddEmployeeDialog';
import PayrollLottie from '@/components/animations/PayrollLottie';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { format } from 'date-fns';
import {
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Upload,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface EnhancedDashboardProps {
  initialEmployees: Employee[];
}

export default function EnhancedDashboard({ initialEmployees }: EnhancedDashboardProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showAgentMonitor, setShowAgentMonitor] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false);
  const [nextPayRunDate, setNextPayRunDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14); // Default to 14 days from now
    return date;
  });

  const stats = useMemo(() => {
    const total = employees.length;
    const pending = employees.filter((e) => e.status === 'pending').length;
    const paid = employees.filter((e) => e.status === 'paid').length;
    const totalPayroll = employees.reduce((sum, e) => sum + (e.salary_usd || 0), 0);
    const pendingAmount = employees
      .filter((e) => e.status === 'pending')
      .reduce((sum, e) => sum + (e.salary_usd || 0), 0);

    return { total, pending, paid, totalPayroll, pendingAmount };
  }, [employees]);

  // Generate payroll data with realistic simulation
  const payrollData = useMemo(() => {
    if (employees.length === 0) return [];

    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const dataPoints = [];
    const totalEmployees = employees.length;
    const avgSalary = employees.reduce((sum, e) => sum + (e.salary_usd || 0), 0) / totalEmployees;

    for (let i = 0; i < 180; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Simulate gradual employee growth over 6 months
      const progress = i / 180; // 0 to 1
      const simulatedEmployees = Math.max(1, Math.floor(totalEmployees * progress * 1.2));

      // Simulate payroll growth with some variation
      const basePayroll = (avgSalary * simulatedEmployees) / 12; // Monthly
      const variation = Math.sin(i / 30) * 0.1; // ±10% variation
      const simulatedPayroll = Math.round(basePayroll * (1 + variation));

      dataPoints.push({
        date: dateStr,
        amount: simulatedPayroll,
        employees: simulatedEmployees,
      });
    }

    return dataPoints;
  }, [employees]);

  // Status distribution data for donut chart
  const statusData = useMemo(() => {
    const pending = employees.filter(e => e.status === 'pending').length;
    const paid = employees.filter(e => e.status === 'paid' || e.status === 'active').length;
    const inactive = employees.filter(e => e.status === 'inactive').length;

    return [
      { name: 'Paid', value: paid, color: '#10B981' },
      { name: 'Pending', value: pending, color: '#F59E0B' },
      { name: 'Inactive', value: inactive, color: '#EF4444' },
    ].filter(item => item.value > 0);
  }, [employees]);

  // Salary distribution data for bar chart
  const salaryRangeData = useMemo(() => {
    const ranges = [
      { range: '$0-30k', min: 0, max: 30000, count: 0 },
      { range: '$30-50k', min: 30000, max: 50000, count: 0 },
      { range: '$50-70k', min: 50000, max: 70000, count: 0 },
      { range: '$70-90k', min: 70000, max: 90000, count: 0 },
      { range: '$90k+', min: 90000, max: Infinity, count: 0 },
    ];

    employees.forEach(emp => {
      const salary = emp.salary_usd || 0;
      const range = ranges.find(r => salary >= r.min && salary < r.max);
      if (range) range.count++;
    });

    return ranges.filter(r => r.count > 0);
  }, [employees]);

  const handleRunPayroll = async () => {
    setShowAgentMonitor(true);
  };

  const handleAgentMonitorClose = async () => {
    setShowAgentMonitor(false);
    // Refresh employees after payroll completion
    try {
      const refreshResponse = await fetch('/api/employees');
      const refreshData = await refreshResponse.json();
      if (refreshData.success && refreshData.employees) {
        setEmployees(refreshData.employees);
      }
    } catch (error) {
      console.error('Failed to refresh employees:', error);
    }
  };

  const handleEmployeeSave = (updatedEmployee: Employee) => {
    setEmployees(prev =>
      prev.map(emp => (emp.id === updatedEmployee.id ? updatedEmployee : emp))
    );
    setEditingEmployee(null);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/onboard', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        alert(`Successfully onboarded ${result.count} employees!`);
        // Refresh employees
        const refreshResponse = await fetch('/api/employees');
        const refreshData = await refreshResponse.json();
        setEmployees(refreshData.employees || []);
        setShowOnboardModal(false);
      } else {
        alert(`Onboarding failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-black mb-2">Dashboard</h1>
        <p className="text-sm text-[#737E9C]">
          Overview of your payroll and employee management
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">
              ${stats.totalPayroll.toLocaleString()}
            </p>
            <p className="text-xs text-[#737E9C] mt-1">Monthly payroll amount</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">{stats.total}</p>
            <p className="text-xs text-[#737E9C] mt-1">Active employees</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">{stats.pending}</p>
            <p className="text-xs text-[#737E9C] mt-1">
              ${stats.pendingAmount.toLocaleString()} pending
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Next Pay Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PayRunScheduler
              value={nextPayRunDate}
              onChange={setNextPayRunDate}
            />
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        <Button
          onClick={() => setShowOnboardModal(true)}
          variant="outline"
          className="border-[#0044FF] text-[#0044FF] hover:bg-[#0044FF]/10"
        >
          <Upload className="w-4 h-4 mr-2" />
          Onboard Employees
        </Button>

        <Button
          onClick={handleRunPayroll}
          disabled={isProcessing || stats.pending === 0}
          className="bg-[#0044FF] hover:bg-[#0033CC] text-white"
        >
          <Play className="w-4 h-4 mr-2" />
          <span className="gradient-text-white">
            Run Payroll with AI ({stats.pending})
          </span>
        </Button>
      </div>

      {/* Payroll Trends Chart */}
      <div className="mb-8">
        <InteractivePayrollChart
          data={payrollData}
          title="Payroll Overview"
          description="Track your team growth and payroll trends over time"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Distribution Donut Chart */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-black">Employee Status Distribution</CardTitle>
            <CardDescription>Breakdown of employee payment status</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={(props: any) => `${props.name}: ${props.value} (${(props.percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                    animationDuration={800}
                    animationBegin={0}
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    formatter={(value: any, name: string) => [`${value} employees`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#737E9C]">
                No employee data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salary Range Distribution Bar Chart */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-black">Salary Distribution</CardTitle>
            <CardDescription>Employee count by salary range</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {salaryRangeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryRangeData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="range"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Employees', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    formatter={(value: any) => [`${value} employees`, 'Count']}
                    cursor={{ fill: 'rgba(0, 68, 255, 0.1)' }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#0044FF"
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#737E9C]">
                No salary data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-black">Employees</CardTitle>
          <CardDescription>Manage your employee roster and payment status</CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-12 text-[#737E9C]">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No employees yet</p>
              <p className="text-sm">Upload a CSV to get started with your payroll</p>
            </div>
          ) : (
            <EmployeeDataTable
              data={employees.filter(e => e.id && e.salary_usd !== undefined && e.status).map(e => ({
                id: e.id!,
                name: e.name,
                email: e.email,
                wallet_address: e.wallet_address,
                salary_usd: e.salary_usd!,
                status: e.status!,
                created_at: e.created_at,
              }))}
              onDataChange={async (updatedData) => {
                // Update local state
                const updatedEmployees = employees.map(e => {
                  const updated = updatedData.find(u => u.id === e.id)
                  return updated ? { ...e, ...updated } : e
                })
                setEmployees(updatedEmployees)
              }}
              onAddEmployee={() => setShowAddEmployeeDialog(true)}
            />
          )}
        </CardContent>
      </Card>

      {/* Onboard Modal */}
      {showOnboardModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowOnboardModal(false)}
        >
          <Card className="w-full max-w-md border-gray-200" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-black">
                Onboard Employees
              </CardTitle>
              <CardDescription>
                Upload a CSV file with employee data. Required columns: name, email, salary_usd
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="w-full p-4 border-2 border-dashed border-[#0044FF] rounded-xl cursor-pointer hover:bg-[#0044FF]/5 transition-colors"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowOnboardModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agent Monitor */}
      <AgentMonitor
        isOpen={showAgentMonitor}
        onClose={handleAgentMonitorClose}
        processType="payroll"
        executeReal={true}
      />

      {/* Employee Edit Dialog */}
      <EmployeeEditDialog
        employee={editingEmployee}
        isOpen={editingEmployee !== null}
        onClose={() => setEditingEmployee(null)}
        onSave={handleEmployeeSave}
      />

      {/* Add Employee Dialog */}
      {showAddEmployeeDialog && (
        <AddEmployeeDialog
          onSuccess={async () => {
            // Refresh employees from API
            const response = await fetch('/api/employees')
            const data = await response.json()
            if (data.success) {
              setEmployees(data.data || [])
            }
            setShowAddEmployeeDialog(false)
          }}
        />
      )}
    </div>
  );
}
