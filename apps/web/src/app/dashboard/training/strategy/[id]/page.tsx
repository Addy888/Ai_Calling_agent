'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Target,
  Database,
  Settings,
  BarChart3,
  Shield,
  Clock,
  GitBranch,
} from 'lucide-react';

export default function StrategyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [strategy, setStrategy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchStrategy();
    }
  }, [params.id]);

  const fetchStrategy = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/training/strategies/${params.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStrategy(data);
      }
    } catch (error) {
      console.error('Failed to fetch strategy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      setValidating(true);
      const response = await fetch(`/api/training/strategies/${params.id}/validate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setStrategy(result.strategy);
        
        toast({
          title: result.validation.isValid ? 'Validation Passed' : 'Validation Issues Found',
          description: result.validation.isValid 
            ? 'Strategy is ready for execution' 
            : `Found ${result.validation.errors.length} errors`,
          variant: result.validation.isValid ? 'default' : 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to validate strategy',
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this strategy?')) return;

    try {
      const response = await fetch(`/api/training/strategies/${params.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Strategy deleted successfully',
        });
        router.push('/dashboard/training/strategy');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete strategy',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p>Strategy not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{strategy.name}</h1>
            <p className="text-muted-foreground">{strategy.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleValidate} disabled={validating}>
            {validating ? 'Validating...' : 'Validate Strategy'}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/training/strategy/${params.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      {strategy.validationResult && (
        <Card className={strategy.isValidated ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {strategy.isValidated ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">
                  {strategy.isValidated ? 'Strategy Validated' : 'Validation Issues'}
                </h3>
                {strategy.validationResult.errors?.length > 0 && (
                  <ul className="mt-2 text-sm space-y-1">
                    {strategy.validationResult.errors.map((error: string, i: number) => (
                      <li key={i} className="text-red-600">• {error}</li>
                    ))}
                  </ul>
                )}
                {strategy.validationResult.warnings?.length > 0 && (
                  <ul className="mt-2 text-sm space-y-1">
                    {strategy.validationResult.warnings.map((warning: string, i: number) => (
                      <li key={i} className="text-yellow-600">• {warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="objectives">Objectives</TabsTrigger>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Strategy Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="mb-2">{strategy.strategyType}</Badge>
                <Separator className="my-4" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pipeline:</span>
                    <Badge variant="outline">{strategy.pipelineType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sampling:</span>
                    <Badge variant="outline">{strategy.samplingStrategy}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loss Function:</span>
                    <Badge variant="outline">{strategy.lossFunction}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fine-Tuning Config:</span>
                  <span>{strategy.fineTuningConfig?.name || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hyperparameter Config:</span>
                  <span>{strategy.hyperparameterConfig?.name || 'Not assigned'}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{strategy.version}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge>{strategy.status}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="objectives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Training Objectives
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Primary Objective</h4>
                <p className="text-sm text-muted-foreground">{strategy.primaryObjective}</p>
              </div>
              {strategy.secondaryObjective && (
                <div>
                  <h4 className="font-semibold mb-2">Secondary Objective</h4>
                  <p className="text-sm text-muted-foreground">{strategy.secondaryObjective}</p>
                </div>
              )}
              {strategy.conversationObjective && (
                <div>
                  <h4 className="font-semibold mb-2">Conversation Objective</h4>
                  <p className="text-sm text-muted-foreground">{strategy.conversationObjective}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datasets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {strategy.primaryDataset && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Database className="h-4 w-4" />
                    Primary Dataset
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{strategy.primaryDataset.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {strategy.primaryDataset.recordCount?.toLocaleString()} samples
                  </p>
                </CardContent>
              </Card>
            )}
            {strategy.secondaryDataset && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Database className="h-4 w-4" />
                    Secondary Dataset
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{strategy.secondaryDataset.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {strategy.secondaryDataset.recordCount?.toLocaleString()} samples
                  </p>
                </CardContent>
              </Card>
            )}
            {strategy.validationDataset && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Database className="h-4 w-4" />
                    Validation Dataset
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{strategy.validationDataset.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {strategy.validationDataset.recordCount?.toLocaleString()} samples
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Evaluation Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evaluation Interval:</span>
                  <span>{strategy.evaluationInterval} steps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto Best Model:</span>
                  <Badge variant={strategy.automaticBestModelSelection ? 'default' : 'secondary'}>
                    {strategy.automaticBestModelSelection ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Early Evaluation:</span>
                  <Badge variant={strategy.earlyEvaluation ? 'default' : 'secondary'}>
                    {strategy.earlyEvaluation ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Failure Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retry Count:</span>
                  <span>{strategy.retryCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rollback Strategy:</span>
                  <Badge variant="outline">{strategy.rollbackStrategy}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Abort Policy:</span>
                  <Badge variant="outline">{strategy.abortPolicy}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {strategy.auditLogs && strategy.auditLogs.length > 0 ? (
                <div className="space-y-4">
                  {strategy.auditLogs.map((log: any) => (
                    <div key={log.id} className="border-l-2 border-primary pl-4 py-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{log.action}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {log.performedBy && (
                        <p className="text-sm text-muted-foreground mt-1">By: {log.performedBy}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No audit logs available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
