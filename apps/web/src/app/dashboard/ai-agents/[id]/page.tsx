'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Square, Pause, RefreshCw, Activity, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dynamic from 'next/dynamic';

const VoiceLibrary = dynamic(() => import('@/components/voice-studio/voice-library').then(mod => ({ default: mod.VoiceLibrary })), { ssr: false });
const VoiceSettings = dynamic(() => import('@/components/voice-studio/voice-settings').then(mod => ({ default: mod.VoiceSettings })), { ssr: false });
const VoicePreview = dynamic(() => import('@/components/voice-studio/voice-preview').then(mod => ({ default: mod.VoicePreview })), { ssr: false });
const VoiceHistory = dynamic(() => import('@/components/voice-studio/voice-history').then(mod => ({ default: mod.VoiceHistory })), { ssr: false });

export default function AgentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [agent, setAgent] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentDetails();
    fetchSessions();
    fetchMetrics();
    fetchHealth();
  }, [params.id]);

  const fetchAgentDetails = async () => {
    try {
      const response = await fetch(`/api/v1/ai-agents/${params.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAgent(data);
      }
    } catch (error) {
      console.error('Failed to fetch agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch(`/api/v1/ai-agents/sessions?agentId=${params.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/v1/ai-agents/${params.id}/metrics?days=7`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const fetchHealth = async () => {
    try {
      const response = await fetch(`/api/v1/ai-agents/${params.id}/health`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Failed to fetch health:', error);
    }
  };

  const startAgent = async () => {
    try {
      const response = await fetch(`/api/v1/ai-agents/${params.id}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Agent started successfully' });
        fetchAgentDetails();
        fetchHealth();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to start agent', variant: 'destructive' });
    }
  };

  const stopAgent = async () => {
    try {
      const response = await fetch(`/api/v1/ai-agents/${params.id}/stop`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Agent stopped successfully' });
        fetchAgentDetails();
        fetchHealth();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to stop agent', variant: 'destructive' });
    }
  };

  const pauseAgent = async () => {
    try {
      const response = await fetch(`/api/v1/ai-agents/${params.id}/pause`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Agent paused successfully' });
        fetchAgentDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to pause agent', variant: 'destructive' });
    }
  };

  const resumeAgent = async () => {
    try {
      const response = await fetch(`/api/v1/ai-agents/${params.id}/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Agent resumed successfully' });
        fetchAgentDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to resume agent', variant: 'destructive' });
    }
  };

  if (loading || !agent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agent details...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: any = {
      READY: 'default',
      THINKING: 'default',
      RESPONDING: 'default',
      WAITING: 'secondary',
      ERROR: 'destructive',
      PAUSED: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const successRate = agent.totalSessions > 0
    ? Math.round((agent.successfulSessions / agent.totalSessions) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{agent.agentName}</h1>
            <p className="text-gray-600">{agent.agentType} Agent</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!agent.isActive ? (
            <Button onClick={startAgent}>
              <Play className="mr-2 h-4 w-4" />
              Start Agent
            </Button>
          ) : agent.status === 'PAUSED' ? (
            <>
              <Button onClick={resumeAgent}>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
              <Button variant="outline" onClick={stopAgent}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={pauseAgent}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
              <Button variant="outline" onClick={stopAgent}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {getStatusBadge(agent.status)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agent.totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(agent.averageResponseTime || 0)}ms
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="voice">Voice Studio</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
              <CardDescription>Current agent configuration and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Agent Type</p>
                  <p className="font-medium">{agent.agentType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Version</p>
                  <p className="font-medium">{agent.version}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Enabled</p>
                  <p className="font-medium">{agent.isEnabled ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="font-medium">{agent.isActive ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Started</p>
                  <p className="font-medium">
                    {agent.lastStartedAt
                      ? new Date(agent.lastStartedAt).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">
                    {new Date(agent.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Trend</CardTitle>
                <CardDescription>Last 7 days performance metrics</CardDescription>
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
                      dataKey="totalSessions"
                      stroke="#8884d8"
                      name="Sessions"
                    />
                    <Line
                      type="monotone"
                      dataKey="successRate"
                      stroke="#82ca9d"
                      name="Success Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Active and recent agent sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-mono text-xs">
                        {session.sessionId.substring(0, 16)}...
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            session.status === 'ACTIVE' ? 'default' : 'secondary'
                          }
                        >
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{session.messageCount}</TableCell>
                      <TableCell>
                        {new Date(session.startedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {session.duration ? `${session.duration}s` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Successful Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{agent.successfulSessions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Failed Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{agent.failedSessions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{successRate}%</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          {health && (
            <Card>
              <CardHeader>
                <CardTitle>Health Status</CardTitle>
                <CardDescription>Current agent health metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Overall Status</p>
                    <Badge
                      variant={
                        health.health?.status === 'HEALTHY' ? 'default' : 'destructive'
                      }
                    >
                      {health.health?.status || 'UNKNOWN'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Sessions</p>
                    <p className="font-medium">{health.activeSessions || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Checked</p>
                    <p className="font-medium">
                      {health.lastChecked
                        ? new Date(health.lastChecked).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="voice" className="space-y-4">
          <Tabs defaultValue="library" className="space-y-4">
            <TabsList>
              <TabsTrigger value="library">Voice Library</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="library">
              <VoiceLibrary agentId={params.id as string} />
            </TabsContent>

            <TabsContent value="settings">
              <VoiceSettings agentId={params.id as string} />
            </TabsContent>

            <TabsContent value="preview">
              <VoicePreview agentId={params.id as string} />
            </TabsContent>

            <TabsContent value="history">
              <VoiceHistory agentId={params.id as string} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
