'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Employee } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import EmployeeEditDialog from './EmployeeEditDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Upload,
  UserPlus,
  Calendar,
  ArrowUpDown,
  Eye,
  Mail,
  Wallet,
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddEmployeeDialog from './AddEmployeeDialog';

interface EmployeesClientProps {
  initialEmployees: Employee[];
}

type SortField = 'name' | 'email' | 'salary_usd' | 'created_at' | 'status';
type SortDirection = 'asc' | 'desc';

export default function EmployeesClient({ initialEmployees }: EmployeesClientProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Calculate statistics from real data
  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((e) => e.status === 'active' || e.status === 'paid').length;
    const pendingEmployees = employees.filter((e) => e.status === 'pending').length;
    const totalPayroll = employees.reduce((sum, e) => sum + (e.salary_usd || 0), 0);
    const avgSalary = totalEmployees > 0 ? totalPayroll / totalEmployees : 0;

    return {
      total: totalEmployees,
      active: activeEmployees,
      pending: pendingEmployees,
      totalPayroll,
      avgSalary,
    };
  }, [employees]);

  // Generate employee growth data from real created_at dates
  const employeeGrowthData = useMemo(() => {
    if (employees.length === 0) return [];

    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        // Get earliest employee date
        const earliestEmployee = employees.reduce((earliest, emp) => {
          const empDate = emp.created_at ? new Date(emp.created_at) : now;
          return empDate < earliest ? empDate : earliest;
        }, now);
        startDate = new Date(earliestEmployee);
        startDate.setDate(startDate.getDate() - 1);
        break;
    }

    // Generate daily data points
    const dataPoints = [];
    const currentDate = new Date(startDate);

    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const employeesAtDate = employees.filter(emp => {
        if (!emp.created_at) return false;
        return new Date(emp.created_at) <= currentDate;
      }).length;

      const totalSalaryAtDate = employees
        .filter(emp => emp.created_at && new Date(emp.created_at) <= currentDate)
        .reduce((sum, emp) => sum + (emp.salary_usd || 0), 0);

      dataPoints.push({
        date: dateStr,
        employees: employeesAtDate,
        totalSalary: totalSalaryAtDate,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dataPoints;
  }, [employees, timeRange]);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.wallet_address && emp.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort employees
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Convert to comparable types
      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [employees, searchTerm, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle CSV upload
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
        // Refresh employees
        const refreshResponse = await fetch('/api/employees');
        const refreshData = await refreshResponse.json();
        setEmployees(refreshData.data || []);
        alert(`Successfully onboarded ${result.count} employees!`);
      } else {
        alert(`Onboarding failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    }
  };

  // Handle employee deletion
  const handleDeleteEmployee = async (employee: Employee) => {
    if (!employee.id) return;

    setIsDeleting(employee.id);

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Remove employee from state
        setEmployees(employees.filter(emp => emp.id !== employee.id));
        alert(`Successfully deleted ${employee.name} from payroll.`);
      } else {
        alert(`Failed to delete employee: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  // Navigate to employee dashboard
  const handleViewEmployee = (employee: Employee) => {
    if (employee.id) {
      router.push(`/dashboard/employee/${employee.id}`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-black mb-2">Employees</h1>
          <p className="text-sm text-[#737E9C]">
            Manage your team and track payroll
          </p>
        </div>
        <div className="flex gap-3">
          <AddEmployeeDialog onSuccess={() => window.location.reload()} />
          <label htmlFor="csv-upload">
            <Button variant="outline" asChild>
              <span className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV
              </span>
            </Button>
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">{stats.total}</p>
            <p className="text-xs text-[#737E9C] mt-1">
              {stats.active} active, {stats.pending} pending
            </p>
          </CardContent>
        </Card>

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
            <p className="text-xs text-[#737E9C] mt-1">Annual</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Average Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">
              ${Math.round(stats.avgSalary).toLocaleString()}
            </p>
            <p className="text-xs text-[#737E9C] mt-1">Per employee</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Monthly Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">
              ${Math.round(stats.totalPayroll / 12).toLocaleString()}
            </p>
            <p className="text-xs text-[#737E9C] mt-1">Estimated</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Growth Chart */}
      <Card className="border-gray-200 mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employee Growth</CardTitle>
              <CardDescription>Track your team size and payroll over time</CardDescription>
            </div>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-32">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
                <SelectItem value="1y">1 year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={employeeGrowthData}>
                <defs>
                  <linearGradient id="colorEmployees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0044FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0044FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="employees"
                  stroke="#0044FF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEmployees)"
                  name="Employees"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card className="border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Employees</CardTitle>
              <CardDescription>View and manage your team members</CardDescription>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-gray-200 hover:bg-gray-50">
                  <TableHead className="font-semibold">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 hover:text-black transition-colors"
                    >
                      Name
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-1 hover:text-black transition-colors"
                    >
                      Email
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">Wallet Address</TableHead>
                  <TableHead className="font-semibold">
                    <button
                      onClick={() => handleSort('salary_usd')}
                      className="flex items-center gap-1 hover:text-black transition-colors"
                    >
                      Annual Salary
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-black transition-colors"
                    >
                      Status
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center gap-1 hover:text-black transition-colors"
                    >
                      Joined
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500 font-medium">
                          {employees.length === 0
                            ? 'No employees found'
                            : 'No employees match your search criteria'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {employees.length === 0
                            ? 'Upload a CSV or add employees manually to get started'
                            : 'Try adjusting your search or filters'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow key={emp.id} className="border-gray-200 hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-black">{emp.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-gray-700">
                          {emp.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {emp.wallet_address ? (
                          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded border border-gray-200">
                            {emp.wallet_address.slice(0, 6)}...{emp.wallet_address.slice(-4)}
                          </code>
                        ) : (
                          <span className="text-gray-400 text-sm">No wallet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-semibold text-black">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          {emp.salary_usd?.toLocaleString() || 0}
                          <span className="text-xs text-gray-500 font-normal ml-1">/year</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            emp.status === 'active' || emp.status === 'paid'
                              ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100'
                              : emp.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100'
                              : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100'
                          }
                        >
                          {emp.status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {emp.created_at
                          ? new Date(emp.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                            title="View employee dashboard"
                            onClick={() => handleViewEmployee(emp)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                                title="More actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewEmployee(emp)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Dashboard
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditingEmployee(emp)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Employee
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                navigator.clipboard.writeText(emp.email);
                              }}>
                                <Mail className="w-4 h-4 mr-2" />
                                Copy Email
                              </DropdownMenuItem>
                              {emp.wallet_address && (
                                <DropdownMenuItem onClick={() => {
                                  if (emp.wallet_address) {
                                    navigator.clipboard.writeText(emp.wallet_address);
                                  }
                                }}>
                                  <Wallet className="w-4 h-4 mr-2" />
                                  Copy Wallet
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Employee
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6 text-red-600" />
                                      </div>
                                      <div>
                                        <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action cannot be undone
                                        </AlertDialogDescription>
                                      </div>
                                    </div>
                                  </AlertDialogHeader>
                                  <div className="py-4">
                                    <p className="text-sm text-gray-700 mb-4">
                                      Are you sure you want to delete <strong>{emp.name}</strong>? This will:
                                    </p>
                                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                      <li>Remove them from payroll</li>
                                      <li>Revoke their dashboard access</li>
                                      <li>Delete all associated payment records</li>
                                      <li>This action cannot be undone</li>
                                    </ul>
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteEmployee(emp)}
                                      disabled={isDeleting === emp.id}
                                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                    >
                                      {isDeleting === emp.id ? 'Deleting...' : 'Delete Employee'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredEmployees.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <p>
                Showing <span className="font-semibold text-black">{filteredEmployees.length}</span> of{' '}
                <span className="font-semibold text-black">{employees.length}</span> employees
              </p>
              <p className="text-gray-500">
                Total annual payroll: <span className="font-semibold text-black">${stats.totalPayroll.toLocaleString()}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Edit Dialog */}
      <EmployeeEditDialog
        employee={editingEmployee}
        isOpen={editingEmployee !== null}
        onClose={() => setEditingEmployee(null)}
        onSave={(updatedEmployee) => {
          setEmployees((prev) =>
            prev.map((emp) => (emp.id === updatedEmployee.id ? updatedEmployee : emp))
          );
          setEditingEmployee(null);
        }}
      />
    </div>
  );
}
