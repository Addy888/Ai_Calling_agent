'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Activity, BarChart3, Zap } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrainingMetrics {
  trainingLoss?: number;
  validationLoss?: number;
  learningRate?: number;
  accuracy?: number;
  perplexity?: number;
  gradientNorm?: number;
  evaluationScore?: number;
  bestMetric?: number;
  lastUpdated: string;
}

interface TrainingMetricsChartsProps {
  metrics: TrainingMetrics;
  detailed?: boolean;
}

export function TrainingMetricsCharts({ metrics, detailed = false }: TrainingMetricsChartsProps) {
  // Generate mock historical data for charts
  const generateHistoricalData = () => {
    const data = [];
    for (let i = 0; i < 50; i++) {
      data.push({
        step: i * 20,
        trainingLoss: 0.5 + Math.random() * 0.3 - (i * 0.005),
        validationLoss: 0.55 + Math.random() * 0.3 - (i * 0.004),
        accuracy: 0.7 + (i * 0.005) + Math.random() * 0.05,
        learningRate: 0.0003 - (i * 0.000002),
      });
    }
    return data;
  };

  const historicalData = generateHistoricalData();

  return (
    <div className="space-y-4">
      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Training Loss</p>
                <p className="text-2xl font-bold">
                  {metrics.trainingLoss?.toFixed(4) || 'N/A'}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Validation Loss</p>
                <p className="text-2xl font-bold">
                  {metrics.validationLoss?.toFixed(4) || 'N/A'}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold">
                  {metrics.accuracy ? `${(metrics.accuracy * 100).toFixed(2)}%` : 'N/A'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Evaluation Score</p>
                <p className="text-2xl font-bold">
                  {metrics.evaluationScore?.toFixed(3) || 'N/A'}
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loss Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Training & Validation Loss
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="step" 
                label={{ value: 'Training Steps', position: 'insideBottom', offset: -5 }}
                className="text-xs"
              />
              <YAxis 
                label={{ value: 'Loss', angle: -90, position: 'insideLeft' }}
                className="text-xs"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))' 
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="trainingLoss" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Training Loss"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="validationLoss" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                name="Validation Loss"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Accuracy Chart */}
      {detailed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Accuracy Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="step" 
                  label={{ value: 'Training Steps', position: 'insideBottom', offset: -5 }}
                  className="text-xs"
                />
                <YAxis 
                  label={{ value: 'Accuracy', angle: -90, position: 'insideLeft' }}
                  domain={[0, 1]}
                  className="text-xs"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.2)"
                  name="Accuracy"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Learning Rate</span>
                <Zap className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="text-xl font-bold">
                {metrics.learningRate?.toExponential(2) || 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Perplexity</span>
                <Activity className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-xl font-bold">
                {metrics.perplexity?.toFixed(3) || 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gradient Norm</span>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-xl font-bold">
                {metrics.gradientNorm?.toFixed(3) || 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Metric Badge */}
      {metrics.bestMetric && (
        <div className="flex items-center justify-center">
          <Badge variant="outline" className="text-lg px-4 py-2">
            🏆 Best Metric: {metrics.bestMetric.toFixed(3)}
          </Badge>
        </div>
      )}

      {/* Last Updated */}
      <p className="text-xs text-center text-muted-foreground">
        Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
      </p>
    </div>
  );
}
