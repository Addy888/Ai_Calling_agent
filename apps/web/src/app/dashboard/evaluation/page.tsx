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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, Filter, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

export default function EvaluationDashboard() {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScore, setFilterScore] = useState('all');

  useEffect(() => {
    fetchEvaluationData();
  }, []);

  const fetchEvaluationData = async () => {
    setLoading(true);
    try {
      const [analyticsRes] = await Promise.all([
        fetch('/api/evaluation/analytics'),
      ]);

      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching evaluation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 75) return <Badge className="bg-blue-500">Good</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge className="bg-red-500">Poor</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const avgScores = analytics && analytics.length > 0
    ? analytics.reduce((acc: any, day: any) => {
        return {
          overall: acc.overall + day.averageScore,
          conversation: acc.conversation + day.averageConversationScore,
          script: acc.script + day.averageScriptScore,
          knowledge: acc.knowledge + day.averageKnowledgeScore,
          decision: acc.decision + day.averageDecisionScore,
          lead: acc.lead + day.averageLeadScore,
          safety: acc.safety + day.averageSafetyScore,
          confidence: acc.confidence + day.averageConfidence,
        };
      }, {
        overall: 0,
        conversation: 0,
        script: 0,
        knowledge: 0,
        decision: 0,
        lead: 0,
        safety: 0,
        confidence: 0,
      })
    : null;

  const avgCount = analytics?.length || 1;
  if (avgScores) {
    Object.keys(avgScores).forEach(key => {
      avgScores[key] = avgScores[key] / avgCount;
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Evaluation Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Monitor and analyze conversation quality metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-3xl font-bold ${getScoreColor(avgScores?.overall || 0)}`}>
                {avgScores?.overall.toFixed(1) || '0.0'}
              </div>
              {avgScores?.overall >= 75 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
            <Progress value={avgScores?.overall || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Conversation Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(avgScores?.conversation || 0)}`}>
              {avgScores?.conversation.toFixed(1) || '0.0'}
            </div>
            <Progress value={avgScores?.conversation || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Safety Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(avgScores?.safety || 0)}`}>
              {avgScores?.safety.toFixed(1) || '0.0'}
            </div>
            <Progress value={avgScores?.safety || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor((avgScores?.confidence || 0) * 100)}`}>
              {((avgScores?.confidence || 0) * 100).toFixed(1)}%
            </div>
            <Progress value={(avgScores?.confidence || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scores">Detailed Scores</TabsTrigger>
          <TabsTrigger value="issues">Issues & Risks</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Score Breakdown</CardTitle>
                <CardDescription>Average scores by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Conversation Quality</span>
                    <span className="font-semibold">{avgScores?.conversation.toFixed(1)}</span>
                  </div>
                  <Progress value={avgScores?.conversation || 0} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Script Compliance</span>
                    <span className="font-semibold">{avgScores?.script.toFixed(1)}</span>
                  </div>
                  <Progress value={avgScores?.script || 0} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Knowledge Accuracy</span>
                    <span className="font-semibold">{avgScores?.knowledge.toFixed(1)}</span>
                  </div>
                  <Progress value={avgScores?.knowledge || 0} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Decision Accuracy</span>
                    <span className="font-semibold">{avgScores?.decision.toFixed(1)}</span>
                  </div>
                  <Progress value={avgScores?.decision || 0} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Lead Quality</span>
                    <span className="font-semibold">{avgScores?.lead.toFixed(1)}</span>
                  </div>
                  <Progress value={avgScores?.lead || 0} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Safety</span>
                    <span className="font-semibold">{avgScores?.safety.toFixed(1)}</span>
                  </div>
                  <Progress value={avgScores?.safety || 0} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Indicators</CardTitle>
                <CardDescription>Key performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">High Quality</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {analytics?.filter((d: any) => d.averageScore >= 80).length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium">Needs Improvement</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">
                    {analytics?.filter((d: any) => d.averageScore >= 60 && d.averageScore < 80).length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Critical Issues</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">
                    {analytics?.filter((d: any) => d.averageScore < 60).length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Evaluation Scores</CardTitle>
              <CardDescription>Historical performance data</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Conversation</TableHead>
                    <TableHead>Knowledge</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Safety</TableHead>
                    <TableHead>Total Evals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.map((day: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                      <TableCell className={getScoreColor(day.averageScore)}>
                        {day.averageScore.toFixed(1)}
                      </TableCell>
                      <TableCell>{day.averageConversationScore.toFixed(1)}</TableCell>
                      <TableCell>{day.averageKnowledgeScore.toFixed(1)}</TableCell>
                      <TableCell>{day.averageDecisionScore.toFixed(1)}</TableCell>
                      <TableCell>{day.averageSafetyScore.toFixed(1)}</TableCell>
                      <TableCell>{day.totalEvaluations}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Common Issues</CardTitle>
              <CardDescription>Most frequent problems detected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-center text-gray-500 py-8">
                <p>No issues data available</p>
                <p className="text-sm">Run evaluations to see common issues</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Score trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                Chart visualization placeholder
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
