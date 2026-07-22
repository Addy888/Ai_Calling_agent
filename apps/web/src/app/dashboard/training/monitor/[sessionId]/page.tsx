'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  Database,
  Download,
  HardDrive,
  Loader2,
  Network,
  Pause,
  Play,
  RefreshCw,
  Server,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { TrainingStatusPanel } from './components/TrainingStatusPanel';
import { TrainingProgressPanel } from './components/TrainingProgressPanel';
import { TrainingMetricsCharts } from './components/TrainingMetricsCharts';
import { PerformanceMetricsPanel } from './components/PerformanceMetricsPanel';
import { ResourceUsagePanel } from './components/ResourceUsagePanel';
import { CheckpointPanel } from './components/CheckpointPanel';
import { LiveLogsPanel } from './components/LiveLogsPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { AlertsPanel } from './components/AlertsPanel';
import { useTrainingMonitor } from './hooks/useTrainingMonitor';

/**
 * Enterprise Live Training Monitor Dashboard
 * 
 * Real-time monitoring dashboard for AI model training sessions
 * Currently displays mock data - will integrate with actual training engine
 */
export default function TrainingMonitorPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const {
    status,
    progress,
    metrics,
    performance,
    resources,
    checkpoint,
    logs,
    timeline,
    alerts,
    isLoading,
    isConnected,
    error,
    refreshStatus,
    exportLogs,
  } = useTrainingMonitor(sessionId);

  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading training monitor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training Monitor</h1>
          <p className="text-muted-foreground">
            Real-time training session monitoring and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? '🟢 Live' : '🔴 Disconnected'}
          </Badge>
          <Button onClick={refreshStatus} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => exportLogs('json')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <AlertsPanel alerts={alerts} />
      )}

      {/* Training Status Summary */}
      {status && (
        <TrainingStatusPanel status={status} />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Progress Panel */}
            {progress && (
              <TrainingProgressPanel progress={progress} />
            )}

            {/* Performance Metrics */}
            {performance && (
              <PerformanceMetricsPanel performance={performance} />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Checkpoint Info */}
            {checkpoint && (
              <CheckpointPanel checkpoint={checkpoint} />
            )}

            {/* Resource Usage Summary */}
            {resources && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Resource Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">GPU Usage</span>
                    <span className="font-semibold">
                      {resources.gpuUsagePercent?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">RAM Usage</span>
                    <span className="font-semibold">
                      {resources.ramUsageGB?.toFixed(1)} / {resources.ramTotalGB} GB
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">CPU Usage</span>
                    <span className="font-semibold">
                      {resources.cpuUsagePercent?.toFixed(1)}%
                    </span>
                  </div>
                  {resources.isEstimated && (
                    <Badge variant="secondary" className="w-full justify-center">
                      Estimated Values (Training Engine Not Active)
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Metrics Chart */}
          {metrics && (
            <TrainingMetricsCharts metrics={metrics} />
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <TrainingMetricsCharts metrics={metrics} detailed />
          )}
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          {resources && (
            <ResourceUsagePanel resources={resources} />
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {logs && (
            <LiveLogsPanel 
              logs={logs} 
              onExport={exportLogs}
              sessionId={sessionId}
            />
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          {timeline && (
            <TimelinePanel timeline={timeline} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
