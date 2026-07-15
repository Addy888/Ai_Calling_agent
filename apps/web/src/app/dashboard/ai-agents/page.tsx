'use client';

import { useState, useEffect } from 'react';
import { Plus, Play, Pause, Square, RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Agent {
  id: string;
  agentName: string;
  agentType: string;
  status: string;
  isEnabled: boolean;
  isActive: boolean;
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  createdAt: string;
}

export default function AIAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    agentName: '',
    agentType: 'CONVERSATIONAL',
    campaignId: '',
    promptId: '',
    scriptId: '',
    configuration: {},
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async () => {
    try {
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'AI Agent created successfully',
        });
        setDialogOpen(false);
        fetchAgents();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create agent',
        variant: 'destructive',
      });
    }
  };

  const startAgent = async (id: string) => {
    try {
      const response = await fetch(`/api/ai-agent/${id}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Agent started successfully',
        });
        fetchAgents();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start agent',
        variant: 'destructive',
      });
    }
  };

  const stopAgent = async (id: string) => {
    try {
      const response = await fetch(`/api/ai-agent/${id}/stop`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Agent stopped successfully',
        });
        fetchAgents();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to stop agent',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    switch (status) {
      case 'READY':
        return <Badge variant="default" className="bg-green-500">Ready</Badge>;
      case 'THINKING':
        return <Badge variant="default" className="bg-blue-500">Thinking</Badge>;
      case 'RESPONDING':
        return <Badge variant="default" className="bg-purple-500">Responding</Badge>;
      case 'ERROR':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AI Agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-gray-600">Manage your AI agent runtime instances</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create AI Agent</DialogTitle>
              <DialogDescription>
                Configure a new AI agent for your campaigns
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Agent Name</Label>
                <Input
                  id="agentName"
                  placeholder="My AI Agent"
                  value={formData.agentName}
                  onChange={(e) =>
                    setFormData({ ...formData, agentName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agentType">Agent Type</Label>
                <Select
                  value={formData.agentType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, agentType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONVERSATIONAL">Conversational</SelectItem>
                    <SelectItem value="SALES">Sales</SelectItem>
                    <SelectItem value="SUPPORT">Support</SelectItem>
                    <SelectItem value="ANALYTICAL">Analytical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createAgent}>Create Agent</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter((a) => a.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.reduce((sum, a) => sum + a.totalSessions, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.length > 0
                ? Math.round(
                    (agents.reduce((sum, a) => sum + a.successfulSessions, 0) /
                      agents.reduce((sum, a) => sum + a.totalSessions, 0)) *
                      100
                  ) || 0
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Agents</CardTitle>
          <CardDescription>View and manage all your AI agents</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/ai-agents/${agent.id}`}
                      className="hover:underline"
                    >
                      {agent.agentName}
                    </Link>
                  </TableCell>
                  <TableCell>{agent.agentType}</TableCell>
                  <TableCell>{getStatusBadge(agent.status, agent.isActive)}</TableCell>
                  <TableCell>{agent.totalSessions}</TableCell>
                  <TableCell>
                    {agent.totalSessions > 0
                      ? Math.round(
                          (agent.successfulSessions / agent.totalSessions) * 100
                        )
                      : 0}
                    %
                  </TableCell>
                  <TableCell>
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {!agent.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startAgent(agent.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => stopAgent(agent.id)}
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
