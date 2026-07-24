'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Database,
  BarChart3,
  FileText,
  Settings,
  Play,
  Eye,
} from 'lucide-react';

export default function DatasetDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const datasetId = params.id as string;

  const [dataset, setDataset] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (datasetId) {
      fetchDatasetDetails();
      fetchStatistics();
      fetchPreview();
    }
  }, [datasetId]);

  const fetchDatasetDetails = async () => {
    try {
      const response = await fetch(`/api/ai-agent/training-datasets/${datasetId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDataset(data);
      }
    } catch (error) {
      console.error('Failed to fetch dataset:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`/api/ai-agent/training-datasets/${datasetId}/statistics`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const fetchPreview = async () => {
    try {
      const response = await fetch(`/api/ai-agent/training-datasets/${datasetId}/preview?limit=10`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      }
    } catch (error) {
      console.error('Failed to fetch preview:', error);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const response = await fetch(`/api/ai-agent/training-datasets/${datasetId}/validate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        await fetchDatasetDetails();
      }
    } catch (error) {
      console.error('Failed to validate dataset:', error);
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Dataset not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    DRAFT: 'secondary',
    PENDING: 'warning',
    READY: 'success',
    IN_USE: 'primary',
    ARCHIVED: 'outline',
  };

  const statusVariant = statusColor[dataset.status] || 'secondary';

  const validationColor = dataset.isValidated
    ? 'success'
    : dataset.validationErrors?.length > 0
    ? 'destructive'
    : 'warning';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{dataset.name}</h1>
            {dataset.description && (
              <p className="text-muted-foreground">{dataset.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant as any}>{dataset.status}</Badge>
          <Badge variant={validationColor as any}>
            {dataset.isValidated ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {dataset.isValidated ? 'Validated' : 'Not Validated'}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            <Database className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dataset Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{dataset.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source Type</p>
                <p className="font-medium">{dataset.sourceType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Record Count</p>
                <p className="font-medium">{dataset.recordCount || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {new Date(dataset.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Validation */}
          <Card>
            <CardHeader>
              <CardTitle>Validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Last Validated: {dataset.lastValidatedAt
                      ? new Date(dataset.lastValidatedAt).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <Button onClick={handleValidate} disabled={validating}>
                  {validating ? 'Validating...' : 'Validate'}
                </Button>
              </div>

              {dataset.validationErrors && dataset.validationErrors.length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium text-destructive">Validation Errors:</p>
                  {dataset.validationErrors.map((error: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 bg-destructive/10 rounded"
                    >
                      <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <p className="text-sm">{error}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle>Dataset Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {statistics ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Records</p>
                    <p className="text-2xl font-bold">{statistics.totalRecords}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Duration</p>
                    <p className="text-2xl font-bold">
                      {statistics.avgDuration ? `${statistics.avgDuration.toFixed(2)}s` : 'N/A'}
                    </p>
                  </div>
                  {/* Add more statistics as needed */}
                </div>
              ) : (
                <p className="text-muted-foreground">Loading statistics...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>First 10 records</CardDescription>
            </CardHeader>
            <CardContent>
              {preview ? (
                <div className="space-y-4">
                  {preview.data?.map((record: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <pre className="text-xs overflow-auto">
                          {JSON.stringify(record, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Loading preview...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Training Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {dataset.trainingConfig ? (
                <pre className="text-sm overflow-auto p-4 bg-muted rounded">
                  {JSON.stringify(dataset.trainingConfig, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No configuration set</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}