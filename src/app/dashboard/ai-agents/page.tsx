'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Brain,
  Cpu,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  Zap,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AgentActivity {
  id: string;
  agent: string;
  action: string;
  status: 'success' | 'pending' | 'failed';
  duration: number;
  timestamp: string;
  details?: string;
}

export default function AIAgentsPage() {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [stats, setStats] = useState({
    totalExecutions: 0,
    successRate: 0,
    avgDuration: 0,
    activeAgents: 0,
  });
  const [agentStats, setAgentStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/ai-agents');
        const result = await response.json();

        if (result.success) {
          setActivities(result.data.activities || []);
          setStats(result.data.stats || {
            totalExecutions: 0,
            successRate: 0,
            avgDuration: 0,
            activeAgents: 0,
          });
          setAgentStats(result.data.agentStats || {});
        }
      } catch (error) {
        console.error('Error fetching AI agent data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTimeSince = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const agents = [
    {
      name: 'Penny AI',
      description: 'Natural language payroll assistant',
      icon: Brain,
      status: agentStats['Penny AI'] ? 'active' : 'idle',
      lastActive: agentStats['Penny AI']
        ? getTimeSince(agentStats['Penny AI'].lastActive)
        : 'Never',
      executions: agentStats['Penny AI']?.executions || 0,
      successRate: agentStats['Penny AI']?.successRate || 0,
    },
    {
      name: 'Payroll Agent',
      description: 'Automated payroll calculations',
      icon: DollarSign,
      status: agentStats['Payroll Agent'] ? 'active' : 'idle',
      lastActive: agentStats['Payroll Agent']
        ? getTimeSince(agentStats['Payroll Agent'].lastActive)
        : 'Never',
      executions: agentStats['Payroll Agent']?.executions || 0,
      successRate: agentStats['Payroll Agent']?.successRate || 0,
    },
    {
      name: 'Executor Agent',
      description: 'Blockchain transaction execution',
      icon: Zap,
      status: agentStats['Executor Agent'] ? 'active' : 'idle',
      lastActive: agentStats['Executor Agent']
        ? getTimeSince(agentStats['Executor Agent'].lastActive)
        : 'Never',
      executions: agentStats['Executor Agent']?.executions || 0,
      successRate: agentStats['Executor Agent']?.successRate || 0,
    },
    {
      name: 'Onboarding Agent',
      description: 'Employee onboarding automation',
      icon: Bot,
      status: agentStats['Onboarding Agent'] ? 'active' : 'idle',
      lastActive: agentStats['Onboarding Agent']
        ? getTimeSince(agentStats['Onboarding Agent'].lastActive)
        : 'Never',
      executions: agentStats['Onboarding Agent']?.executions || 0,
      successRate: agentStats['Onboarding Agent']?.successRate || 0,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'idle':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Idle</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Error</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#0044FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#737E9C]">Loading AI agent data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-black mb-2">AI Agent Monitoring</h1>
        <p className="text-sm text-[#737E9C]">
          Monitor and track all AI agents powering your payroll automation
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Total Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">{stats.totalExecutions}</p>
            <p className="text-xs text-[#737E9C] mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-green-600">{stats.successRate}%</p>
            <p className="text-xs text-[#737E9C] mt-1">All agents combined</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">{stats.avgDuration.toFixed(1)}s</p>
            <p className="text-xs text-[#737E9C] mt-1">Per execution</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-[#737E9C] flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Active Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-black">{stats.activeAgents}</p>
            <p className="text-xs text-[#737E9C] mt-1">Currently running</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {agents.map((agent) => (
          <Card key={agent.name} className="border-gray-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <agent.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-black">
                      {agent.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {agent.description}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(agent.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-[#737E9C] text-xs">Last Active</p>
                  <p className="font-medium text-black">{agent.lastActive}</p>
                </div>
                <div>
                  <p className="text-[#737E9C] text-xs">Executions</p>
                  <p className="font-medium text-black">{agent.executions}</p>
                </div>
                <div>
                  <p className="text-[#737E9C] text-xs">Success Rate</p>
                  <p className="font-medium text-green-600">{agent.successRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-black">Recent Activity</CardTitle>
          <CardDescription>Latest AI agent executions and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200">
                <TableHead className="text-[#737E9C]">Agent</TableHead>
                <TableHead className="text-[#737E9C]">Action</TableHead>
                <TableHead className="text-[#737E9C]">Status</TableHead>
                <TableHead className="text-[#737E9C]">Duration</TableHead>
                <TableHead className="text-[#737E9C]">Time</TableHead>
                <TableHead className="text-[#737E9C]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#737E9C]">
                    No agent activity found. Start using the system to see agent executions here.
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => (
                  <TableRow key={activity.id} className="border-gray-200">
                    <TableCell className="font-medium">{activity.agent}</TableCell>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(activity.status)}
                        <Badge
                          variant="outline"
                          className={
                            activity.status === 'success'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : activity.status === 'pending'
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{activity.duration.toFixed(2)}s</TableCell>
                    <TableCell className="text-sm text-[#737E9C]">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-sm text-[#737E9C]">
                      {activity.details || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
