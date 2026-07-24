'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Settings,
  Database,
  Cpu,
  PlayCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConfigDetails {
  id: string;
  name: string;
  description?: string;
  trainingMethod: string;
  baseModelId?: string;
  datasetId?: string;
  configurationVersion: string;
  precision: string;
  loraConfig?: any;
  qloraConfig?: any;
  peftConfig?: any;
  status: string;
  isValidated: boolean;
  validatedAt?: string;
  validationResult?: any;
  tags?: Record<string, any>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export default function FineTuningConfigDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [config, setConfig] = useState<ConfigDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchConfiguration();
    }
  }, [params.id]);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/training/fine-tuning-configs/${params.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      if (response.ok) {
        const result = await response.json();
        setConfig(result);
      } else {
        throw new Error('Failed to fetch configuration');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load configuration details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateConfiguration = async () => {
    try {
      setValidating(true);
      const response = await fetch(`/api/training/fine-tuning-configs/${params.id}/validate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: result.isValid ? 'Validation Passed' : 'Validation Failed',
          description: result.isValid
            ? 'Configuration is ready for training'
            : `Found ${result.errors.length} errors`,
          variant: result.isValid ? 'default' : 'destructive',
        });
        fetchConfiguration(); // Refresh data
      } else {
        throw new Error('Validation failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to validate configuration',
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; variant: any; label: string }> = {
      DRAFT: { icon: Clock, variant: 'secondary', label: 'Draft' },
      READY: { icon: CheckCircle, variant: 'default', label: 'Ready' },
      VALIDATED: { icon: CheckCircle, variant: 'default', label: 'Validated' },
      ARCHIVED: { icon: AlertCircle, variant: 'secondary', label: 'Archived' },
      DEPRECATED: { icon: XCircle, variant: 'destructive', label: 'Deprecated' },
    };

    const config = variants[status] || { icon: AlertCircle, variant: 'secondary', label: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Configuration not found</h3>
            <Button className="mt-4" onClick={() => router.back()}>
              Go Back
            </Button>
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
            <h1 className="text-3xl font-bold tracking-tight">{config.name}</h1>
            <p className="text-muted-foreground">
              {config.description || 'Fine-tuning configuration details'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={validateConfiguration}
            disabled={validating}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {validating ? 'Validating...' : 'Validate'}
          </Button>
          <Button onClick={() => router.push(`/dashboard/training/fine-tuning/${config.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>{getStatusBadge(config.status)}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validated</CardTitle>
            {config.isValidated ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config.isValidated ? 'Yes' : 'No'}</div>
            {config.validatedAt && (
              <p className="text-xs text-muted-foreground">
                {new Date(config.validatedAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Method</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{config.trainingMethod.replace(/_/g, ' ')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precision</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{config.precision}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Details */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {config.loraConfig && <TabsTrigger value="lora">LoRA Config</TabsTrigger>}
          {config.qloraConfig && <TabsTrigger value="qlora">QLoRA Config</TabsTrigger>}
          {config.peftConfig && <TabsTrigger value="peft">PEFT Config</TabsTrigger>}
          {config.validationResult && <TabsTrigger value="validation">Validation</TabsTrigger>}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Configuration Name</p>
                  <p className="text-sm font-semibold">{config.name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Version</p>
                  <p className="text-sm">
                    <code className="bg-muted px-2 py-1 rounded">{config.configurationVersion}</code>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Training Method</p>
                  <p className="text-sm">{config.trainingMethod.replace(/_/g, ' ')}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Precision</p>
                  <Badge variant="outline">{config.precision}</Badge>
                </div>

                {config.baseModelId && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Base Model ID</p>
                    <p className="text-sm font-mono text-xs">{config.baseModelId}</p>
                  </div>
                )}

                {config.datasetId && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Dataset ID</p>
                    <p className="text-sm font-mono text-xs">{config.datasetId}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">{new Date(config.createdAt).toLocaleString()}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                  <p className="text-sm">{new Date(config.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              {config.description && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{config.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LoRA Configuration */}
        {config.loraConfig && (
          <TabsContent value="lora" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>LoRA Configuration</CardTitle>
                <CardDescription>Low-Rank Adaptation parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(config.loraConfig).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-sm font-semibold">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* QLoRA Configuration */}
        {config.qloraConfig && (
          <TabsContent value="qlora" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>QLoRA Configuration</CardTitle>
                <CardDescription>Quantized LoRA parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(config.qloraConfig).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm font-semibold">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* PEFT Configuration */}
        {config.peftConfig && (
          <TabsContent value="peft" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>PEFT Configuration</CardTitle>
                <CardDescription>Parameter-Efficient Fine-Tuning settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(config.peftConfig).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-sm font-semibold">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Validation Results */}
        {config.validationResult && (
          <TabsContent value="validation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Validation Results</CardTitle>
                <CardDescription>
                  Configuration validation status and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    {config.validationResult.baseModelReady ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Base Model Ready</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {config.validationResult.datasetReady ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Dataset Ready</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {config.validationResult.compatibilityPassed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Compatibility Passed</span>
                  </div>
                </div>

                {config.validationResult.errors?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-red-600">Errors</h4>
                    <ul className="space-y-1">
                      {config.validationResult.errors.map((error: string, idx: number) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {config.validationResult.warnings?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-yellow-600">Warnings</h4>
                    <ul className="space-y-1">
                      {config.validationResult.warnings.map((warning: string, idx: number) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {config.validationResult.recommendations?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-blue-600">Recommendations</h4>
                    <ul className="space-y-1">
                      {config.validationResult.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
