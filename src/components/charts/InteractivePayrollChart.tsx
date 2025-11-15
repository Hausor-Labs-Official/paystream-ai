"use client"

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface PayrollData {
  date: string;
  amount: number;
  employees: number;
}

interface InteractivePayrollChartProps {
  data: PayrollData[];
  title?: string;
  description?: string;
}

export function InteractivePayrollChart({
  data,
  title = "Payroll Trends",
  description = "Track payroll amounts over time with interactive controls"
}: InteractivePayrollChartProps) {
  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d' | '1y' | 'all' | 'custom'>('30d');
  const [metric, setMetric] = React.useState<'amount' | 'employees'>('amount');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

  const filteredData = React.useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = now;

    if (timeRange === 'custom' && dateRange?.from) {
      startDate = dateRange.from;
      endDate = dateRange.to || now;
      return data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

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
        return data;
    }

    return data.filter(item => new Date(item.date) >= startDate);
  }, [data, timeRange, dateRange]);

  const formatYAxis = (value: number) => {
    if (metric === 'amount') {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  const formatTooltip = (value: number) => {
    if (metric === 'amount') {
      return [`$${value.toLocaleString()}`, 'Amount'];
    }
    return [value, 'Employees'];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 backdrop-blur-sm bg-opacity-95">
          <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
          <p className={`text-lg font-bold ${metric === 'amount' ? 'text-blue-600' : 'text-cyan-600'}`}>
            {metric === 'amount' ? `$${payload[0].value.toLocaleString()}` : `${payload[0].value} employees`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            <CardDescription className="text-sm mt-1">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
              <SelectTrigger className="w-32 border-gray-300 hover:border-blue-400 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="employees">Employees</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-32 border-gray-300 hover:border-blue-400 transition-colors">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
                <SelectItem value="1y">1 year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>

            {timeRange === 'custom' && (
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                placeholder="Select date range"
                className="w-auto"
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0044FF" stopOpacity={0.9}/>
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#93C5FD" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorEmployees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.9}/>
                  <stop offset="50%" stopColor="#22d3ee" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#a5f3fc" stopOpacity={0.1}/>
                </linearGradient>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                className="text-xs"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis
                tickFormatter={formatYAxis}
                className="text-xs"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={metric === 'amount' ? '#0044FF' : '#06b6d4'}
                strokeWidth={3}
                fillOpacity={1}
                fill={metric === 'amount' ? 'url(#colorAmount)' : 'url(#colorEmployees)'}
                animationDuration={800}
                animationEasing="ease-in-out"
                filter="url(#shadow)"
                dot={{ r: 0 }}
                activeDot={{
                  r: 6,
                  fill: metric === 'amount' ? '#0044FF' : '#06b6d4',
                  stroke: '#fff',
                  strokeWidth: 2
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-200 pt-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors duration-200">
            <p className="text-xs font-medium text-gray-600 mb-1">Total</p>
            <p className="text-2xl font-bold text-blue-900">
              {metric === 'amount'
                ? `$${filteredData.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}`
                : filteredData.reduce((sum, d) => sum + d.employees, 0)
              }
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors duration-200">
            <p className="text-xs font-medium text-gray-600 mb-1">Average</p>
            <p className="text-2xl font-bold text-purple-900">
              {metric === 'amount'
                ? `$${(filteredData.reduce((sum, d) => sum + d.amount, 0) / filteredData.length || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : Math.round(filteredData.reduce((sum, d) => sum + d.employees, 0) / filteredData.length || 0)
              }
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-colors duration-200">
            <p className="text-xs font-medium text-gray-600 mb-1">Peak</p>
            <p className="text-2xl font-bold text-green-900">
              {metric === 'amount'
                ? `$${Math.max(...filteredData.map(d => d.amount)).toLocaleString()}`
                : Math.max(...filteredData.map(d => d.employees))
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
