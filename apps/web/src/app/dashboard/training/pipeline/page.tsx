'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useToast } from '@/components/ui/use-toast';
import {
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Plus,
  Eye,
  Trash2,
  RefreshCw,
  Settings,
  ArrowRight,
  Database,
  Cpu,
  HardDrive,
} from 'lucide-react';

interface Pipeline {
  id: string;
  pipelineName: string;
  pipelineIdentifier: string;
  pipelineStage: string;
  pipelineStatus: string;
  queueStatus: string;
  queuePosition?: number;
  validationPassed: boolean;
  resourceEstimation?: {
    gpuMemoryGB: number;
    ramGB: number;
    diskSpaceGB: number;
    cpuCores: number;
    checkpointStorageGB: number;
    durationHours: number;
  };
  createdAt: string;
  updatedAt: string;
  session?: {
    sessionName: string;
    status: string;
  };
}

interface TrainingSession {
  id: string;
  sessionName: string;
  sessionIdentifier: string;
  status: string;
  datasetId: string;
  modelRegistryId: string;
}

export default function TrainingPipelinePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [prepareDialogOpen, setPrepareDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchPipelines();
    fetchTrainingSessions();
  }, []);

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/training-pipeline', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPipelines(data);
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch pipelines',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainingSessions = async () => {
    try {
      const response = await fetch('/api/training-manager/training-versions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTrainingSessions(data);
      }
    } catch (error) {
      console.error('Failed to fetch training sessions:', error);
    }
  };

  const handlePrepareSession = async () => {
    if (!selectedSession) {
      toast({
        title: 'Error',
        description: 'Please select a training session',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/training-pipeline/prepare-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          trainingSessionId: selectedSession,
          autoEstimateResources: true,
          autoGenerateCheckpointPlan: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: 'Training pipeline prepared successfully',
        });
        setPrepareDialogOpen(false);
        setSelectedSession('');
        fetchPipelines();
        router.push(`/dashboard/training/pipeline/${data.id}`);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to prepare pipeline',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to prepare session:', error);
      toast({
        title: 'Error',
        description: 'Failed to prepare pipeline',
        variant: 'destructive',
      });
    }
  };

  const handleValidatePipeline = async (pipelineId: string) => {
    try {
      const response = await fetch(`/api/training-pipeline/${pipelineId}/validate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.overallValid) {
          toast({
            title: 'Validation Passed',
            description: 'Pipeline is ready for training',
          });
        } else {
          toast({
            title: 'Validation Failed',
            description: result.errors?.join(', ') || 'Pipeline validation failed',
            variant: 'destructive',
          });
        }
        fetchPipelines();
      }
    } catch (error) {
      console.error('Failed to validate pipeline:', error);
      toast({
        title: 'Error',
        description: 'Failed to validate pipeline',
        variant: 'destructive',
      });
    }
  };

  const handleQueuePipeline = async (pipelineId: string) => {
    try {
      const response = await fetch('/api/training-pipeline/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          pipelineId,
          priority: 5,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Pipeline queued successfully',
        });
        fetchPipelines();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to queue pipeline',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to queue pipeline:', error);
      toast({
        title: 'Error',
        description: 'Failed to queue pipeline',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePipeline = async (pipelineId: string) => {
    if (!confirm('Are you sure you want to delete this pipeline?')) {
      return;
    }

    try {
      const response = await fetch(`/api/training-pipeline/${pipelineId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Pipeline deleted successfully',
        });
        fetchPipelines();
      }
    } catch (error) {
      console.error('Failed to delete pipeline:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete pipeline',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      PENDING: { color: 'bg-gray-500', icon: <Clock className="w-3 h-3" /> },
      VALIDATING: { color: 'bg-blue-500', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      VALID: { color: 'bg-green-500', icon: <CheckCircle2 className="w-3 h-3" /> },
      INVALID: { color: 'bg-red-500', icon: <XCircle className="w-3 h-3" /> },
      PREPARING: { color: 'bg-blue-500', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      PREPARED: { color: 'bg-green-500', icon: <CheckCircle2 className="w-3 h-3" /> },
      QUEUED: { color: 'bg-purple-500', icon: <Clock className="w-3 h-3" /> },
      WAITING: { color: 'bg-yellow-500', icon: <Clock className="w-3 h-3" /> },
      PAUSED: { color: 'bg-orange-500', icon: <Pause className="w-3 h-3" /> },
      CANCELLED: { color: 'bg-gray-500', icon: <XCircle className="w-3 h-3" /> },
      FAILED: { color: 'bg-red-500', icon: <XCircle className="w-3 h-3" /> },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        {config.icon}
        {status}
      </Badge>
    );
  };

  const getStageBadge = (stage: string) => {
    const stageConfig: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-800',
      VALIDATED: 'bg-green-100 text-green-800',
      QUEUED: 'bg-purple-100 text-purple-800',
      WAITING: 'bg-yellow-100 text-yellow-800',
      PREPARED: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge variant="outline" className={stageConfig[stage] || stageConfig.PENDING}>
        {stage}
      </Badge>
    );
  };

  const filteredPipelines = pipelines.filter((pipeline) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return pipeline.pipelineStage === 'PENDING';
    if (activeTab === 'validated') return pipeline.pipelineStage === 'VALIDATED';
    if (activeTab === 'prepared') return pipeline.pipelineStage === 'PREPARED';
    if (activeTab === 'queued') return pipeline.pipelineStage === 'QUEUED';
    return true;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Pipeline</h1>
          <p className="text-muted-foreground mt-2">
            Prepare and manage training pipelines for AI model fine-tuning
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchPipelines()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setPrepareDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Prepare Pipeline
          </Button>
        </div>
      </div>

      {/* Pipeline Workflow Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Workflow</CardTitle>
          <CardDescription>Complete training pipeline preparation stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Database className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-medium">Dataset Ready</p>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400" />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                <Cpu className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium">Model Selected</p>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400" />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium">Compatibility Passed</p>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400" />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-2">
                <Settings className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-sm font-medium">Pipeline Prepared</p>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400" />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-sm font-medium">Waiting for Training</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipelines</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipelines.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prepared</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pipelines.filter((p) => p.pipelineStage === 'PREPARED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pipelines.filter((p) => p.queueStatus === 'QUEUED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pipelines.filter((p) => p.pipelineStatus === 'FAILED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipelines List */}
      <Card>
        <CardHeader>
          <CardTitle>Training Pipelines</CardTitle>
          <CardDescription>Manage and monitor training pipeline preparation</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="validated">Validated</TabsTrigger>
              <TabsTrigger value="prepared">Prepared</TabsTrigger>
              <TabsTrigger value="queued">Queued</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredPipelines.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No pipelines found</p>
                  <Button
                    className="mt-4"
                    onClick={() => setPrepareDialogOpen(true)}
                  >
                    Create First Pipeline
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pipeline Name</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Queue</TableHead>
                      <TableHead>Resources</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPipelines.map((pipeline) => (
                      <TableRow key={pipeline.id}>
                        <TableCell className="font-medium">
                          {pipeline.pipelineName}
                          <div className="text-xs text-gray-500">
                            {pipeline.pipelineIdentifier}
                          </div>
                        </TableCell>
                        <TableCell>
                          {pipeline.session?.sessionName || 'N/A'}
                        </TableCell>
                        <TableCell>{getStageBadge(pipeline.pipelineStage)}</TableCell>
                        <TableCell>{getStatusBadge(pipeline.pipelineStatus)}</TableCell>
                        <TableCell>
                          {pipeline.queuePosition ? (
                            <Badge variant="outline">#{pipeline.queuePosition}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {pipeline.resourceEstimation ? (
                            <div className="text-xs space-y-1">
                              <div className="flex items-center gap-1">
                                <HardDrive className="w-3 h-3" />
                                {pipeline.resourceEstimation.gpuMemoryGB}GB GPU
                              </div>
                              <div className="text-gray-500">
                                {pipeline.resourceEstimation.durationHours.toFixed(1)}h est.
                              </div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(pipeline.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(`/dashboard/training/pipeline/${pipeline.id}`)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {pipeline.pipelineStage === 'VALIDATED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQueuePipeline(pipeline.id)}
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                            {pipeline.pipelineStage === 'PENDING' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleValidatePipeline(pipeline.id)}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePipeline(pipeline.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Prepare Pipeline Dialog */}
      <Dialog open={prepareDialogOpen} onOpenChange={setPrepareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prepare Training Pipeline</DialogTitle>
            <DialogDescription>
              Select a training session to prepare the pipeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="session">Training Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Select training session" />
                </SelectTrigger>
                <SelectContent>
                  {trainingSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.sessionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrepareDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrepareSession}>
              Prepare Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
