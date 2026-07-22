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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Zap,
  Brain,
  Server,
  Cpu,
  HardDrive,
  Globe,
  Code,
  FileText,
  Shield,
} from 'lucide-react';

export default function ModelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params.id as string;

  const [model, setModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (modelId) {
      fetchModel();
    }
  }, [modelId]);

  const fetchModel = async () => {
    try {
      const response = await fetch(`/api/ai-agent/models/${modelId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setModel(data);
      }
    } catch (error) {
      console.error('Failed to fetch model:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; color: string; label: string }> = {
      AVAILABLE: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Available' },
      COMING_SOON: { icon: Clock, color: 'text-blue-600 bg-blue-50', label: 'Coming Soon' },
      EXPERIMENTAL: { icon: Zap, color: 'text-yellow-600 bg-yellow-50', label: 'Experimental' },
      DISABLED: { icon: XCircle, color: 'text-gray-600 bg-gray-50', label: 'Disabled' },
      DEPRECATED: { icon: XCircle, color: 'text-red-600 bg-red-50', label: 'Deprecated' },
    };

    const { icon: Icon, color, label } = config[status] || config.AVAILABLE;
    return (
      <Badge className={`${color} border-0`}>
        <Icon className="h-4 w-4 mr-1" />
        {label}
      </Badge>
    );
  };

  const formatVRAM = (vram: number) => `${vram}GB`;
  const formatContext = (length: number) => {
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M tokens`;
    if (length >= 1000) return `${(length / 1000).toFixed(0)}K tokens`;
    return `${length} tokens`;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Model not found</h3>
            <p className="text-muted-foreground">The requested model does not exist</p>
            <Button className="mt-4" onClick={() => router.push('/dashboard/training/models')}>
              Back to Model Library
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
        <Button variant="ghost" onClick={() => router.push('/dashboard/training/models')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Model Library
        </Button>
      </div>

      {/* Model Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Brain className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-3xl">{model.name}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {model.provider} • {model.family} Family • v{model.version}
                  </CardDescription>
                </div>
              </div>
            </div>
            {getStatusBadge(model.status)}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{model.description}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Technical Specifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Technical Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Parameters</span>
                <Badge variant="secondary" className="font-mono">
                  {model.parameters}
                </Badge>
              </div>
              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Context Window</span>
                <span className="text-sm font-medium">{formatContext(model.contextLength)}</span>
              </div>
              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Minimum VRAM</span>
                <span className="text-sm font-medium">{formatVRAM(model.minimumVram)}</span>
              </div>
              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recommended VRAM</span>
                <span className="text-sm font-medium">{formatVRAM(model.recommendedVram)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Provider Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Provider Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Provider</span>
                <Badge variant="outline">{model.provider}</Badge>
              </div>
              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Model Family</span>
                <Badge variant="outline">{model.family}</Badge>
              </div>
              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <code className="text-sm bg-muted px-2 py-1 rounded">{model.version}</code>
              </div>
              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  License
                </span>
                <span className="text-sm font-medium">{model.license}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Language Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {model.languages?.map((lang: string) => (
                <Badge key={lang} variant="secondary">
                  {lang.toUpperCase()}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Supports {model.languages?.length || 0} languages
            </p>
          </CardContent>
        </Card>

        {/* Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {model.capabilities?.map((capability: string) => (
                <Badge key={capability} variant="outline" className="capitalize">
                  {capability.replace(/-/g, ' ')}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {model.capabilities?.length || 0} core capabilities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quantization Support */}
      {model.quantizationSupport && model.quantizationSupport.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Quantization Support
            </CardTitle>
            <CardDescription>
              Available precision formats for optimized performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {model.quantizationSupport.map((quant: string) => (
                <Badge key={quant} variant="secondary" className="font-mono">
                  {quant}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Note */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <FileText className="h-5 w-5" />
            Usage Information
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900">
          <p>
            This is a model registry entry. The actual model is not downloaded or stored locally.
            Model metadata is maintained for training configuration and deployment planning purposes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
