'use client';

import React, { useState, useEffect } from 'react';
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
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Rocket,
  Shield,
  Target,
  Zap,
  Download,
} from 'lucide-react';

export default function ReadinessDashboard() {
  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReadinessData();
  }, []);

  const fetchReadinessData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/training/readiness');
      const data = await res.json();
      setReadiness(data);
    } catch (error) {
      console.error('Error fetching readiness data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReadinessColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReadinessGradient = (score: number) => {
    if (score >= 85) return 'from-green-50 to-emerald-50';
    if (score >= 70) return 'from-yellow-50 to-amber-50';
    return 'from-red-50 to-rose-50';
  };

  const getReadinessStatus = (score: number) => {
    if (score >= 85) return { label: 'Production Ready', color: 'bg-green-500', icon: CheckCircle };
    if (score >= 70)
      return { label: 'Nearly Ready', color: 'bg-yellow-500', icon: AlertTriangle };
    return { label: 'Not Ready', color: 'bg-red-500', icon: AlertTriangle };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const status = getReadinessStatus(readiness?.overallReadiness || 0);
  const StatusIcon = status.icon;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Readiness Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Comprehensive AI preparation status for production deployment
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReadinessData}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overall Readiness Score */}
      <Card
        className={`border-2 ${
          readiness?.isReady ? 'border-green-300' : 'border-yellow-300'
        } bg-gradient-to-r ${getReadinessGradient(readiness?.overallReadiness || 0)}`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-6 w-6" />
            Production Readiness Score
          </CardTitle>
          <CardDescription>
            Overall AI system readiness for live deployment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div
                className={`text-6xl font-bold ${getReadinessColor(
                  readiness?.overallReadiness || 0,
                )}`}
              >
                {readiness?.overallReadiness?.toFixed(1) || '0.0'}%
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <StatusIcon className={`h-6 w-6 ${getReadinessColor(readiness?.overallReadiness || 0)}`} />
                <Badge className={status.color}>{status.label}</Badge>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {readiness?.isReady
                  ? 'System is ready for deployment'
                  : 'Additional work required before deployment'}
              </div>
            </div>

            <div className="col-span-2 space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Knowledge Readiness</span>
                  </div>
                  <span className="font-semibold">
                    {readiness?.knowledgeReadiness?.toFixed(1) || 0}%
                  </span>
                </div>
                <Progress value={readiness?.knowledgeReadiness || 0} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>Conversation Readiness</span>
                  </div>
                  <span className="font-semibold">
                    {readiness?.conversationReadiness?.toFixed(1) || 0}%
                  </span>
                </div>
                <Progress value={readiness?.conversationReadiness || 0} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span>Prompt & Script Readiness</span>
                  </div>
                  <span className="font-semibold">
                    {readiness?.promptReadiness?.toFixed(1) || 0}%
                  </span>
                </div>
                <Progress value={readiness?.promptReadiness || 0} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span>Decision Engine Readiness</span>
                  </div>
                  <span className="font-semibold">
                    {readiness?.decisionReadiness?.toFixed(1) || 0}%
                  </span>
                </div>
                <Progress value={readiness?.decisionReadiness || 0} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Evaluation Readiness</span>
                  </div>
                  <span className="font-semibold">
                    {readiness?.evaluationReadiness?.toFixed(1) || 0}%
                  </span>
                </div>
                <Progress value={readiness?.evaluationReadiness || 0} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="blockers">Blockers</TabsTrigger>
          <TabsTrigger value="warnings">Warnings</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Knowledge Base</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${getReadinessColor(
                    readiness?.knowledgeReadiness || 0,
                  )}`}
                >
                  {readiness?.knowledgeReadiness?.toFixed(1) || 0}%
                </div>
                <Progress value={readiness?.knowledgeReadiness || 0} className="mt-2" />
                <p className="text-xs text-gray-500 mt-2">
                  Document coverage and quality validation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Conversation Training</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${getReadinessColor(
                    readiness?.conversationReadiness || 0,
                  )}`}
                >
                  {readiness?.conversationReadiness?.toFixed(1) || 0}%
                </div>
                <Progress value={readiness?.conversationReadiness || 0} className="mt-2" />
                <p className="text-xs text-gray-500 mt-2">
                  Historical conversation data and patterns
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Prompts & Scripts</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${getReadinessColor(
                    readiness?.promptReadiness || 0,
                  )}`}
                >
                  {readiness?.promptReadiness?.toFixed(1) || 0}%
                </div>
                <Progress value={readiness?.promptReadiness || 0} className="mt-2" />
                <p className="text-xs text-gray-500 mt-2">Approved prompts and script coverage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Script Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${getReadinessColor(
                    readiness?.scriptReadiness || 0,
                  )}`}
                >
                  {readiness?.scriptReadiness?.toFixed(1) || 0}%
                </div>
                <Progress value={readiness?.scriptReadiness || 0} className="mt-2" />
                <p className="text-xs text-gray-500 mt-2">Script completeness and validation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Decision Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${getReadinessColor(
                    readiness?.decisionReadiness || 0,
                  )}`}
                >
                  {readiness?.decisionReadiness?.toFixed(1) || 0}%
                </div>
                <Progress value={readiness?.decisionReadiness || 0} className="mt-2" />
                <p className="text-xs text-gray-500 mt-2">Business rules and decision logic</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Evaluation System</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${getReadinessColor(
                    readiness?.evaluationReadiness || 0,
                  )}`}
                >
                  {readiness?.evaluationReadiness?.toFixed(1) || 0}%
                </div>
                <Progress value={readiness?.evaluationReadiness || 0} className="mt-2" />
                <p className="text-xs text-gray-500 mt-2">Quality metrics and evaluation data</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="blockers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Critical Blockers
              </CardTitle>
              <CardDescription>
                Issues that must be resolved before production deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {readiness?.blockers && readiness.blockers.length > 0 ? (
                <div className="space-y-3">
                  {readiness.blockers.map((blocker: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg"
                    >
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold text-red-900">{blocker.type}</div>
                        <div className="text-sm text-red-800 mt-1">{blocker.message}</div>
                        <Badge className="mt-2 bg-red-600">
                          {blocker.severity || 'critical'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                  <p className="text-green-600 font-semibold">No Critical Blockers</p>
                  <p className="text-sm text-gray-500 mt-2">
                    All critical requirements have been met
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Warnings
              </CardTitle>
              <CardDescription>Issues that should be addressed but are not blocking</CardDescription>
            </CardHeader>
            <CardContent>
              {readiness?.warnings && readiness.warnings.length > 0 ? (
                <div className="space-y-3">
                  {readiness.warnings.map((warning: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold text-yellow-900">{warning.type}</div>
                        <div className="text-sm text-yellow-800 mt-1">{warning.message}</div>
                        <Badge className="mt-2 bg-yellow-600">
                          {warning.severity || 'medium'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                  <p className="text-green-600 font-semibold">No Warnings</p>
                  <p className="text-sm text-gray-500 mt-2">System is in excellent condition</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Recommendations
              </CardTitle>
              <CardDescription>Suggested actions to improve AI readiness</CardDescription>
            </CardHeader>
            <CardContent>
              {readiness?.recommendations && readiness.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {readiness.recommendations.map((rec: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-blue-900">{rec.type}</div>
                        <div className="text-sm text-blue-800 mt-1">{rec.message}</div>
                        <Badge className="mt-2 bg-blue-600">{rec.priority || 'normal'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                  <p className="text-green-600 font-semibold">No Recommendations</p>
                  <p className="text-sm text-gray-500 mt-2">
                    System is optimally configured
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Deployment Status */}
      {readiness?.isReady && (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-green-500 text-white rounded-full p-3">
                  <Rocket className="h-8 w-8" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-900">Ready for Deployment</div>
                  <div className="text-green-700 mt-1">
                    Your AI system has met all production readiness criteria
                  </div>
                </div>
              </div>
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                <Rocket className="h-5 w-5 mr-2" />
                Deploy to Production
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
