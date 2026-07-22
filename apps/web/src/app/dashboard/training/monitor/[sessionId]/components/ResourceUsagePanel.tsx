'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Server, Cpu, HardDrive, Database, Network, Info } from 'lucide-react';

interface ResourceUsage {
  gpuUsagePercent?: number;
  gpuMemoryUsedGB?: number;
  gpuMemoryTotalGB?: number;
  ramUsageGB?: number;
  ramTotalGB?: number;
  cpuUsagePercent?: number;
  diskUsageGB?: number;
  networkUsageMbps?: number;
  isEstimated: boolean;
}

interface ResourceUsagePanelProps {
  resources: ResourceUsage;
}

export function ResourceUsagePanel({ resources }: ResourceUsagePanelProps) {
  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'text-red-500';
    if (percent >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-4">
      {resources.isEstimated && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            These are estimated resource usage values. Actual hardware monitoring will be available when the training engine is integrated.
          </AlertDescription>
        </Alert>
      )}

      {/* GPU Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            GPU Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">GPU Utilization</span>
              <span className={`text-lg font-bold ${getUsageColor(resources.gpuUsagePercent || 0)}`}>
                {resources.gpuUsagePercent?.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={resources.gpuUsagePercent || 0} 
              className="h-3"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">GPU Memory</span>
              <span className="text-sm font-semibold">
                {resources.gpuMemoryUsedGB?.toFixed(1)} / {resources.gpuMemoryTotalGB} GB
              </span>
            </div>
            <Progress 
              value={((resources.gpuMemoryUsedGB || 0) / (resources.gpuMemoryTotalGB || 1)) * 100} 
              className="h-3"
            />
          </div>
        </CardContent>
      </Card>

      {/* RAM Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            RAM Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Memory Utilization</span>
            <span className={`text-lg font-bold ${getUsageColor(((resources.ramUsageGB || 0) / (resources.ramTotalGB || 1)) * 100)}`}>
              {((resources.ramUsageGB || 0) / (resources.ramTotalGB || 1) * 100).toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={((resources.ramUsageGB || 0) / (resources.ramTotalGB || 1)) * 100} 
            className="h-3"
          />
          <p className="text-xs text-muted-foreground text-right">
            {resources.ramUsageGB?.toFixed(1)} / {resources.ramTotalGB} GB
          </p>
        </CardContent>
      </Card>

      {/* CPU Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-purple-500" />
            CPU Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">CPU Utilization</span>
            <span className={`text-lg font-bold ${getUsageColor(resources.cpuUsagePercent || 0)}`}>
              {resources.cpuUsagePercent?.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={resources.cpuUsagePercent || 0} 
            className="h-3"
          />
        </CardContent>
      </Card>

      {/* Disk & Network */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-4 w-4 text-orange-500" />
              Disk Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold">{resources.diskUsageGB?.toFixed(1)} GB</p>
              <p className="text-xs text-muted-foreground">Total Used</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="h-4 w-4 text-teal-500" />
              Network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold">{resources.networkUsageMbps?.toFixed(0)} Mbps</p>
              <p className="text-xs text-muted-foreground">Transfer Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
