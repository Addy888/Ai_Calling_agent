'use client';

import { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function RuntimeMonitorPage() {
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [poolStats, setPoolStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchSystemHealth(),
      fetchAgents(),
      fetchCompanyMetrics(),
      fetchPoolStats(),
    ]);
    setLoading(false);
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/ai-agent/health/system', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/ai-agent', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const fetchCompanyMetrics = async () => {
    try {
      const response = await fetch('/api/ai-agent/metrics/company?days=7', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || []);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const fetchPoolStats = async () => {
    try {
      const response = await fetch('/api/ai-agent/pool/statistics', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPoolStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch pool stats:', error);
    }
  };

  const getHealthBadge = (status: string) => {
    const variants: any = {
      HEALTHY: 'default',
      DEGRADED: 'secondary',
      UNHEALTHY: 'destructive',
      CRITICAL: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading runtime monitor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Runtime Monitor</h1>
          <p className="text-gray-600">Real-time AI agent runtime monitoring and analytics</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {systemHealth && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.totalAgents}</div>
              <p className="text-xs text-muted-foreground">
                {systemHealth.activeAgents} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Zap className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.totalActiveSessions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <AlertCircle
                className={`h-4 w-4 ${
                  systemHealth.healthPercentage > 80
                    ? 'text-green-500'
                    : systemHealth.healthPercentage > 50
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(systemHealth.healthPercentage)}%</div>
              <Progress value={systemHealth.healthPercentage} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilization</CardTitle>
              <Cpu className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {poolStats ? Math.round(poolStats.utilizationRate) : 0}%
              </div>
              <Progress
                value={poolStats ? poolStats.utilizationRate : 0}
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Runtime Status</CardTitle>
              <CardDescription>Real-time status of all AI agents</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Avg Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.agentName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            agent.status === 'READY'
                              ? 'default'
                              : agent.status === 'ERROR'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {agent.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{agent.agentType}</TableCell>
                      <TableCell>
                        {agent.isActive ? (
                          <Badge variant="default" className="bg-green-500">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{agent.totalSessions}</TableCell>
                      <TableCell>
                        {agent.totalSessions > 0
                          ? Math.round(
                              (agent.successfulSessions / agent.totalSessions) * 100
                            )
                          : 0}
                        %
                      </TableCell>
                      <TableCell>{Math.round(agent.averageResponseTime || 0)}ms</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Last 7 days performance data</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalSessions" fill="#8884d8" name="Sessions" />
                    <Bar dataKey="completedSessions" fill="#82ca9d" name="Completed" />
                    <Bar dataKey="failedSessions" fill="#ff7c7c" name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trend</CardTitle>
                <CardDescription>Average response time over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="averageResponseTime"
                      stroke="#8884d8"
                      name="Avg Response (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          {systemHealth && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Health Distribution</CardTitle>
                    <CardDescription>Agent health status breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Healthy</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={
                            systemHealth.totalAgents > 0
                              ? (systemHealth.healthDistribution.healthy /
                                  systemHealth.totalAgents) *
                                100
                              : 0
                          }
                          className="w-32"
                        />
                        <span className="text-sm font-medium">
                          {systemHealth.healthDistribution.healthy}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Degraded</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={
                            systemHealth.totalAgents > 0
                              ? (systemHealth.healthDistribution.degraded /
                                  systemHealth.totalAgents) *
                                100
                              : 0
                          }
                          className="w-32"
                        />
                        <span className="text-sm font-medium">
                          {systemHealth.healthDistribution.degraded}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Unhealthy</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={
                            systemHealth.totalAgents > 0
                              ? (systemHealth.healthDistribution.unhealthy /
                                  systemHealth.totalAgents) *
                                100
                              : 0
                          }
                          className="w-32"
                        />
                        <span className="text-sm font-medium">
                          {systemHealth.healthDistribution.unhealthy}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Critical</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={
                            systemHealth.totalAgents > 0
                              ? (systemHealth.healthDistribution.critical /
                                  systemHealth.totalAgents) *
                                100
                              : 0
                          }
                          className="w-32"
                        />
                        <span className="text-sm font-medium">
                          {systemHealth.healthDistribution.critical}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Agent Pool Statistics</CardTitle>
                    <CardDescription>Current agent pool status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {poolStats && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total Agents</span>
                          <span className="text-sm font-medium">
                            {poolStats.totalAgents}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Active Agents</span>
                          <span className="text-sm font-medium">
                            {poolStats.activeAgents}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Available Agents</span>
                          <span className="text-sm font-medium">
                            {poolStats.availableAgents}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Disabled Agents</span>
                          <span className="text-sm font-medium">
                            {poolStats.disabledAgents}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Utilization Rate</span>
                          <span className="text-sm font-medium">
                            {Math.round(poolStats.utilizationRate)}%
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
