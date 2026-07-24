'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Play,
  Settings,
  Database,
  Cpu,
  HardDrive,
  MemoryStick,
  Timer,
  Save,
  ChevronRight,
} from 'lucide-react';

interface PipelineDetails {
  id: string;
  pipelineName: string;
  pipelineIdentifier: string;
  pipelineStage: string;
  pipelineStatus: string;
  queueStatus: string;
  queuePosition?: number;
  validationPassed: boolean;
  datasetValid: boolean;
  modelValid: boolean;
  configurationValid: boolean;
  compatibilityValid: boolean;
  readinessValid: boolean;
  workspaceValid: boolean;
  resourceEstimation?: {
    gpuMemoryGB: number;
    ramGB: number;
    diskSpaceGB: number;
    cpuCores: number;
    checkpointStorageGB: number;
    durationHours: number;
    metadata?: any;
  };
  checkpointPlan?: {
    checkpointInterval: number;
    maxCheckpoints: number;
    checkpointNaming: string;
    retentionPolicy: string;
    autoCleanup: boolean;
    pathPattern?: string;
  };
  retryPolicy?: {
    maxRetries: number;
    backoffStrategy: string;
    initialDelaySeconds: number;
    maxDelaySeconds: number;
  };
  executionProvider?: string;
  storageProvider?: string;
  createdAt: string;
  updatedAt: string;
  preparedAt?: string;
  validatedAt?: string;
  session?: {
    sessionName: string;
    status: string;
  };
  stages?: Array<{
    stage: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    duration?: number;
    message?: string;
  }>;
}

export default function PipelineDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [pipeline, setPipeline] = useState<PipelineDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPipelineDetails();
    }
  }, [params.id]);

  const fetchPipelineDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/training-pipeline/${params.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPipeline(data);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch pipeline details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch pipeline details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch pipeline details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      setValidating(true);
      const response = await fetch(`/api/training-pipeline/${params.id}/validate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
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
        fetchPipelineDetails();
      }
    } catch (error) {
      console.error('Failed to validate pipeline:', error);
      toast({
        title: 'Error',
        description: 'Failed to validate pipeline',
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleQueue = async () => {
    try {
      const response = await fetch('/api/training-pipeline/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          pipelineId: params.id,
          priority: 5,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Pipeline queued successfully',
        });
        fetchPipelineDetails();
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      PENDING: { color: 'bg-gray-500', icon: <Clock className="w-3 h-3" /> },
      VALIDATING: { color: 'bg-blue-500', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      VALID: { color: 'bg-green-500', icon: <CheckCircle2 className="w-3 h-3" /> },
      INVALID: { color: 'bg-red-500', icon: <XCircle className="w-3 h-3" /> },
      PREPARING: { color: 'bg-blue-500', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      PREPARED: { color: 'bg-green-500', icon: <CheckCircle2 className="w-3 h-3" /> },
      QUEUED: { color: 'bg-purple-500', icon: <Clock className="w-3 h-3" /> },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        {config.icon}
        {status}
      </Badge>
    );
  };

  const getValidationIcon = (valid: boolean) => {
    return valid ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Pipeline not found</p>
          <Button className="mt-4" onClick={() => router.push('/dashboard/training/pipeline')}>
            Back to Pipelines
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/training/pipeline')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{pipeline.pipelineName}</h1>
            <p className="text-muted-foreground mt-1">{pipeline.pipelineIdentifier}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {pipeline.pipelineStage === 'PENDING' && (
            <Button onClick={handleValidate} disabled={validating}>
              {validating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Validate Pipeline
            </Button>
          )}
          {pipeline.pipelineStage === 'VALIDATED' && (
            <Button onClick={handleQueue}>
              <Play className="w-4 h-4 mr-2" />
              Queue for Training
            </Button>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipeline.pipelineStage}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current processing stage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent>
            {getStatusBadge(pipeline.pipelineStatus)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipeline.queueStatus}</div>
            {pipeline.queuePosition && (
              <p className="text-xs text-muted-foreground mt-1">
                Position #{pipeline.queuePosition}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validation</CardTitle>
          </CardHeader>
          <CardContent>
            {pipeline.validationPassed ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Passed</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Failed</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Timeline</CardTitle>
          <CardDescription>Track the progression of your training pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pipeline.stages?.map((stage, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  {stage.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : stage.status === 'FAILED' ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : stage.status === 'IN_PROGRESS' ? (
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  ) : (
                    <Clock className="w-6 h-6 text-gray-400" />
                  )}
                  {index < (pipeline.stages?.length || 0) - 1 && (
                    <div className="w-0.5 h-12 bg-gray-200 my-2" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{stage.stage}</h4>
                    <Badge variant="outline">{stage.status}</Badge>
                  </div>
                  {stage.message && (
                    <p className="text-sm text-gray-600 mt-1">{stage.message}</p>
                  )}
                  {stage.startedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(stage.startedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Validation Status */}
        <Card>
          <CardHeader>
            <CardTitle>Validation Status</CardTitle>
            <CardDescription>Pipeline readiness checks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Dataset Valid</span>
              {getValidationIcon(pipeline.datasetValid)}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Model Valid</span>
              {getValidationIcon(pipeline.modelValid)}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Configuration Valid</span>
              {getValidationIcon(pipeline.configurationValid)}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Compatibility Valid</span>
              {getValidationIcon(pipeline.compatibilityValid)}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Readiness Valid</span>
              {getValidationIcon(pipeline.readinessValid)}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Workspace Valid</span>
              {getValidationIcon(pipeline.workspaceValid)}
            </div>
          </CardContent>
        </Card>

        {/* Resource Estimation */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Estimation</CardTitle>
            <CardDescription>Required resources for training</CardDescription>
          </CardHeader>
          <CardContent>
            {pipeline.resourceEstimation ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">GPU Memory</span>
                  </div>
                  <span className="font-medium">
                    {pipeline.resourceEstimation.gpuMemoryGB} GB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MemoryStick className="w-5 h-5 text-green-500" />
                    <span className="text-sm">System RAM</span>
                  </div>
                  <span className="font-medium">
                    {pipeline.resourceEstimation.ramGB} GB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-purple-500" />
                    <span className="text-sm">Disk Space</span>
                  </div>
                  <span className="font-medium">
                    {pipeline.resourceEstimation.diskSpaceGB} GB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-orange-500" />
                    <span className="text-sm">CPU Cores</span>
                  </div>
                  <span className="font-medium">
                    {pipeline.resourceEstimation.cpuCores}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Save className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm">Checkpoint Storage</span>
                  </div>
                  <span className="font-medium">
                    {pipeline.resourceEstimation.checkpointStorageGB} GB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-red-500" />
                    <span className="text-sm">Estimated Duration</span>
                  </div>
                  <span className="font-medium">
                    {pipeline.resourceEstimation.durationHours.toFixed(1)} hours
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No resource estimation available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checkpoint Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Checkpoint Plan</CardTitle>
            <CardDescription>Model checkpoint strategy</CardDescription>
          </CardHeader>
          <CardContent>
            {pipeline.checkpointPlan ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Checkpoint Interval</span>
                  <span className="font-medium">
                    {pipeline.checkpointPlan.checkpointInterval} steps
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm">Max Checkpoints</span>
                  <span className="font-medium">
                    {pipeline.checkpointPlan.maxCheckpoints}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm">Naming Convention</span>
                  <span className="font-medium">
                    {pipeline.checkpointPlan.checkpointNaming}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm">Retention Policy</span>
                  <span className="font-medium">
                    {pipeline.checkpointPlan.retentionPolicy}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto Cleanup</span>
                  <span className="font-medium">
                    {pipeline.checkpointPlan.autoCleanup ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {pipeline.checkpointPlan.pathPattern && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">Path Pattern</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {pipeline.checkpointPlan.pathPattern}
                      </code>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No checkpoint plan configured</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Pipeline execution settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Execution Provider</span>
              <Badge variant="outline">
                {pipeline.executionProvider || 'Not configured'}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Storage Provider</span>
              <Badge variant="outline">
                {pipeline.storageProvider || 'Not configured'}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Created</span>
              <span className="text-sm text-gray-600">
                {new Date(pipeline.createdAt).toLocaleString()}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Updated</span>
              <span className="text-sm text-gray-600">
                {new Date(pipeline.updatedAt).toLocaleString()}
              </span>
            </div>
            {pipeline.validatedAt && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm">Validated</span>
                  <span className="text-sm text-gray-600">
                    {new Date(pipeline.validatedAt).toLocaleString()}
                  </span>
                </div>
              </>
            )}
            {pipeline.preparedAt && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm">Prepared</span>
                  <span className="text-sm text-gray-600">
                    {new Date(pipeline.preparedAt).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
