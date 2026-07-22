'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, Activity, Database } from 'lucide-react';

interface PerformanceMetrics {
  tokensPerSecond?: number;
  samplesPerSecond?: number;
  iterationsPerSecond?: number;
  processedTokens?: number;
  processedSamples?: number;
  estimatedRemainingTime?: string;
}

interface PerformanceMetricsPanelProps {
  performance: PerformanceMetrics;
}

export function PerformanceMetricsPanel({ performance }: PerformanceMetricsPanelProps) {
  const formatNumber = (num?: number) => {
    if (!num) return 'N/A';
    return new Intl.NumberFormat().format(Math.floor(num));
  };

  const formatDecimal = (num?: number, decimals: number = 2) => {
    if (!num) return 'N/A';
    return num.toFixed(decimals);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Throughput Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Tokens / Second</span>
            </div>
            <Badge variant="secondary" className="font-mono">
              {formatNumber(performance.tokensPerSecond)}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Samples / Second</span>
            </div>
            <Badge variant="secondary" className="font-mono">
              {formatDecimal(performance.samplesPerSecond)}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Iterations / Second</span>
            </div>
            <Badge variant="secondary" className="font-mono">
              {formatDecimal(performance.iterationsPerSecond)}
            </Badge>
          </div>
        </div>

        {/* Processed Data */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Processed Tokens</span>
            <span className="text-sm font-semibold">
              {formatNumber(performance.processedTokens)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Processed Samples</span>
            <span className="text-sm font-semibold">
              {formatNumber(performance.processedSamples)}
            </span>
          </div>
        </div>

        {/* Estimated Time */}
        {performance.estimatedRemainingTime && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Estimated Remaining</span>
              </div>
              <Badge className="font-mono">
                {performance.estimatedRemainingTime}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
