'use client';

import { useState, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Settings,
  Shield,
  TrendingUp,
} from 'lucide-react';

interface EvaluationDetail {
  id: string;
  name: string;
  trainingSessionId: string;
  modelRegistryId: string;
  evaluationType: string;
  overallScore: number;
  approvalStatus: string;
  createdAt: Date;
  updatedAt: Date;
  description: string;
  metrics: {
    accuracy: number;
    latency: number;
    f1Score: number;
    loss: number;
  };
}

export default function EvaluationDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [evaluation, setEvaluation] = useState<EvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch based on ID
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const mockData: Record<string, EvaluationDetail> = {
          'eval-1': {
            id: 'eval-1',
            name: 'AI Agent v2.0 - Final Validation',
            trainingSessionId: 'session-1',
            modelRegistryId: 'model-1',
            evaluationType: 'FINAL_MODEL',
            overallScore: 92.5,
            approvalStatus: 'APPROVED',
            createdAt: new Date(Date.now() - 86400000 * 2),
            updatedAt: new Date(Date.now() - 86400000),
            description: 'Production candidate validation against gold dataset.',
            metrics: {
              accuracy: 94.2,
              latency: 180,
              f1Score: 92.8,
              loss: 0.12,
            },
          },
          'eval-2': {
            id: 'eval-2',
            name: 'AI Agent v1.9 - Regression Test',
            trainingSessionId: 'session-2',
            modelRegistryId: 'model-2',
            evaluationType: 'REGRESSION',
            overallScore: 87.3,
            approvalStatus: 'PENDING_REVIEW',
            createdAt: new Date(Date.now() - 86400000 * 3),
            updatedAt: new Date(Date.now() - 86400000 * 2),
            description: 'Regression testing against baseline v1.8 behavior.',
            metrics: {
              accuracy: 89.1,
              latency: 195,
              f1Score: 88.0,
              loss: 0.18,
            },
          },
          'eval-3': {
            id: 'eval-3',
            name: 'AI Agent v1.8 - Benchmark Comparison',
            trainingSessionId: 'session-3',
            modelRegistryId: 'model-3',
            evaluationType: 'BENCHMARK',
            overallScore: 79.8,
            approvalStatus: 'NEEDS_RETRAINING',
            createdAt: new Date(Date.now() - 86400000 * 5),
            updatedAt: new Date(Date.now() - 86400000 * 4),
            description: 'Comparison with standard benchmark parameters.',
            metrics: {
              accuracy: 81.4,
              latency: 210,
              f1Score: 80.1,
              loss: 0.25,
            },
          },
        };

        const result = mockData[id as string] || {
          id: id as string,
          name: `Evaluation ${id}`,
          trainingSessionId: 'session-unknown',
          modelRegistryId: 'model-unknown',
          evaluationType: 'UNKNOWN',
          overallScore: 75.0,
          approvalStatus: 'PENDING_REVIEW',
          createdAt: new Date(),
          updatedAt: new Date(),
          description: 'No detailed description available.',
          metrics: {
            accuracy: 75.0,
            latency: 200,
            f1Score: 75.0,
            loss: 0.3,
          },
        };

        setEvaluation(result);
      } catch (err) {
        console.error('Failed to load evaluation details', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDetail();
    }
  }, [id]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      PENDING_REVIEW: 'bg-blue-100 text-blue-800 border-blue-200',
      NEEDS_RETRAINING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <Badge variant="outline" className={styles[status] || 'bg-gray-100'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-red-600">Evaluation Not Found</h2>
        <Button className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{evaluation.name}</h1>
            {getStatusBadge(evaluation.approvalStatus)}
          </div>
          <p className="text-gray-500 mt-1">{evaluation.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Stats Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Overall Performance</CardTitle>
            <CardDescription>Evaluation score summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-6">
              <span className={`text-6xl font-extrabold ${getScoreColor(evaluation.overallScore)}`}>
                {evaluation.overallScore.toFixed(1)}%
              </span>
              <p className="text-sm text-gray-500 mt-2">Overall Score</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Pass Threshold</span>
                <span className="font-semibold text-green-600">80.0%</span>
              </div>
              <Progress value={evaluation.overallScore} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Detailed Metrics */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Validation Metrics</CardTitle>
            <CardDescription>Model benchmarks against gold dataset</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 border rounded-xl bg-gray-50/50 space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Accuracy</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold">{evaluation.metrics.accuracy}%</div>
              <Progress value={evaluation.metrics.accuracy} className="h-1 bg-gray-200" />
            </div>

            <div className="p-4 border rounded-xl bg-gray-50/50 space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Average Latency</span>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">{evaluation.metrics.latency} ms</div>
              <div className="text-xs text-gray-500">Target: &lt; 200ms</div>
            </div>

            <div className="p-4 border rounded-xl bg-gray-50/50 space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>F1-Score</span>
                <Shield className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold">{evaluation.metrics.f1Score}%</div>
              <Progress value={evaluation.metrics.f1Score} className="h-1 bg-gray-200" />
            </div>

            <div className="p-4 border rounded-xl bg-gray-50/50 space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Validation Loss</span>
                <Settings className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold">{evaluation.metrics.loss.toFixed(3)}</div>
              <div className="text-xs text-gray-500">Lower is better</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for details */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="configs">Configurations</TabsTrigger>
              <TabsTrigger value="logs">Validation Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4 pt-4">
              <div className="space-y-2">
                <h4 className="text-md font-semibold">Evaluation Metadata</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Evaluation Type</span>
                    <span className="font-semibold">{evaluation.evaluationType}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Model Registry ID</span>
                    <span className="font-semibold">{evaluation.modelRegistryId}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Training Session</span>
                    <span className="font-semibold">{evaluation.trainingSessionId}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Created At</span>
                    <span className="font-semibold">{evaluation.createdAt.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="configs" className="pt-4">
              <p className="text-sm text-gray-500">Model parameters and dataset configuration mapped from training session metadata.</p>
            </TabsContent>
            <TabsContent value="logs" className="pt-4">
              <p className="text-sm text-gray-500">Console logs and outputs generated during the validation pipeline run.</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
