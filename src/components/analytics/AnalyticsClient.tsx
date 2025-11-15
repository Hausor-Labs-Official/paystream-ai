'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, DollarSign, Activity, Sparkles, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { InteractivePayrollChart } from '@/components/charts/InteractivePayrollChart';

interface AnalyticsClientProps {
  initialData: any;
}

export default function AnalyticsClient({ initialData }: AnalyticsClientProps) {
  const [aiInsights, setAiInsights] = React.useState<string>('');
  const [isLoadingInsights, setIsLoadingInsights] = React.useState(false);

  // Use real data from API or fallback to empty
  const stats = initialData?.stats || {
    totalEmployees: 0,
    activeEmployees: 0,
    totalPayroll: 0,
    avgSalary: 0,
    totalTransactions: 0,
    totalTransactionVolume: 0,
  };

  const payrollData = initialData?.payrollData || [];
  const transactionDistribution = initialData?.transactionDistribution || [];
  const employeeSalaryDistribution = initialData?.employeeSalaryDistribution || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const getAIInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const response = await fetch('/api/penny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Analyze our payroll trends and provide insights on cost optimization and employee compensation patterns. Be concise.',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAiInsights(data.response);
      }
    } catch (error) {
      console.error('Error getting AI insights:', error);
      setAiInsights('Unable to generate insights at this time.');
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Calculate salary range
  const salaries = employeeSalaryDistribution.flatMap((dist: any) =>
    Array(dist.count).fill(parseInt(dist.range.replace(/\D/g, '')))
  );
  const minSalary = salaries.length > 0 ? Math.min(...salaries) : 0;
  const maxSalary = salaries.length > 0 ? Math.max(...salaries) : 0;
  const medianSalary = salaries.length > 0 ? salaries[Math.floor(salaries.length / 2)] : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black mb-2">Analytics Dashboard</h1>
            <p className="text-sm text-[#737E9C]">
              AI-powered insights into your payroll and transaction data
            </p>
          </div>
          <Button onClick={getAIInsights} disabled={isLoadingInsights} className="bg-[#0044FF] hover:bg-[#0033CC] text-white">
            <Sparkles className="mr-2 h-4 w-4" />
            {isLoadingInsights ? 'Analyzing...' : 'Get AI Insights'}
          </Button>
        </div>
      </div>

      {/* AI Insights Card */}
      {aiInsights && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center font-semibold">
              <Sparkles className="mr-2 h-5 w-5 text-purple-600" />
              Penny's AI Insights
            </CardTitle>
            <CardDescription>AI-generated analysis of your payroll data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed font-medium">{aiInsights}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Payroll (Annual)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-black">${stats.totalPayroll.toLocaleString()}</p>
              <p className="text-xs text-[#737E9C] mt-1">
                All employees combined
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Avg. Salary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-black">${Math.round(stats.avgSalary).toLocaleString()}</p>
              <p className="text-xs text-[#737E9C] mt-1">
                Per employee
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
                <Users className="w-4 h-4" />
                Active Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-black">{stats.totalEmployees}</p>
              <p className="text-xs text-[#737E9C] mt-1">
                {stats.activeEmployees} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-black">{stats.totalTransactions}</p>
              <p className="text-xs text-[#737E9C] mt-1">
                ${Math.round(stats.totalTransactionVolume).toLocaleString()} volume
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="payroll" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payroll">
              <BarChart3 className="mr-2 h-4 w-4" />
              Payroll Trends
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <PieChartIcon className="mr-2 h-4 w-4" />
              Transaction Distribution
            </TabsTrigger>
            <TabsTrigger value="salaries">
              <TrendingUp className="mr-2 h-4 w-4" />
              Salary Distribution
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payroll" className="space-y-4">
            {/* Interactive Gradient Area Chart */}
            <InteractivePayrollChart
              data={payrollData}
              title="Payroll Trends"
              description="Real-time payroll tracking with date range controls based on your employee data"
            />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Transaction Distribution</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Real breakdown of all transaction types by volume and count
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {transactionDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={transactionDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={{
                          stroke: '#9CA3AF',
                          strokeWidth: 1
                        }}
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={110}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {transactionDistribution.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px 12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No transaction data available
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transactionDistribution.map((item: any, index: number) => (
                <Card
                  key={item.name}
                  className="border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2 animate-pulse"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {item.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-purple-900 bg-clip-text text-transparent">
                      ${Math.round(item.value).toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {item.count} transactions
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="salaries" className="space-y-4">
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Employee Salary Distribution</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Real distribution of employee salaries from your database
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {employeeSalaryDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={employeeSalaryDistribution}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0044FF" stopOpacity={1} />
                          <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.5} />
                      <XAxis
                        dataKey="range"
                        stroke="#6b7280"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#6b7280"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value: any) => [value, 'Employees']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px 12px'
                        }}
                        cursor={{ fill: '#93C5FD', opacity: 0.2 }}
                      />
                      <Bar
                        dataKey="count"
                        fill="url(#barGradient)"
                        name="Employees"
                        radius={[8, 8, 0, 0]}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No salary data available
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-gray-200 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-50 to-cyan-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                    Median Salary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900">${medianSalary.toLocaleString()}</div>
                  <p className="text-xs text-blue-600 mt-1">
                    Annual compensation
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-purple-50 to-pink-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-purple-600" />
                    Salary Range
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900">
                    ${(minSalary/1000).toFixed(0)}k - ${(maxSalary/1000).toFixed(0)}k
                  </div>
                  <p className="text-xs text-purple-600 mt-1">
                    Minimum to maximum
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                    Total Annual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900">${stats.totalPayroll.toLocaleString()}</div>
                  <p className="text-xs text-green-600 mt-1">
                    All employees combined
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}
