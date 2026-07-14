'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Shield,
  Brain,
  MessageSquare,
  FileText,
  Target,
  Database,
  Lock
} from 'lucide-react';

export default function EvaluationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvaluation();
  }, [params.id]);

  const fetchEvaluation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/evaluation/report/${params.id}`);
      const data = await response.json();
      setEvaluation(data);
    } catch (error) {
      console.error('Error fetching evaluation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-blue-600 bg-blue-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
      case 'CRITICAL':
        return 'bg-red-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
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
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Evaluation not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Evaluation Report</h1>
          <p className="text-gray-500 mt-1">
            Conversation ID: {evaluation.conversationId}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold p-4 rounded-lg text-center ${getScoreColor(evaluation.overallScore)}`}>
              {evaluation.overallScore.toFixed(1)}
            </div>
            <Progress value={evaluation.overallScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={evaluation.evaluationStatus === 'COMPLETED' ? 'bg-green-500' : 'bg-yellow-500'}>
              {evaluation.evaluationStatus}
            </Badge>
            <p className="text-sm text-gray-500 mt-2">
              Evaluated: {new Date(evaluation.evaluatedAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Issues Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-center">
              {evaluation.issues?.length || 0}
            </div>
            <p className="text-sm text-gray-500 text-center mt-2">
              {evaluation.issues?.filter((i: any) => i.severity === 'HIGH').length || 0} High Priority
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scores" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
                <CardTitle className="text-sm font-medium">Conversation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(evaluation.conversationScore)}`}>
                  {evaluation.conversationScore.toFixed(1)}
                </div>
                <Progress value={evaluation.conversationScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <FileText className="h-4 w-4 mr-2 text-purple-500" />
                <CardTitle className="text-sm font-medium">Script Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(evaluation.scriptComplianceScore)}`}>
                  {evaluation.scriptComplianceScore.toFixed(1)}
                </div>
                <Progress value={evaluation.scriptComplianceScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Database className="h-4 w-4 mr-2 text-green-500" />
                <CardTitle className="text-sm font-medium">Knowledge Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(evaluation.knowledgeAccuracyScore)}`}>
                  {evaluation.knowledgeAccuracyScore.toFixed(1)}
                </div>
                <Progress value={evaluation.knowledgeAccuracyScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Brain className="h-4 w-4 mr-2 text-indigo-500" />
                <CardTitle className="text-sm font-medium">Decision Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(evaluation.decisionAccuracyScore)}`}>
                  {evaluation.decisionAccuracyScore.toFixed(1)}
                </div>
                <Progress value={evaluation.decisionAccuracyScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Target className="h-4 w-4 mr-2 text-orange-500" />
                <CardTitle className="text-sm font-medium">Lead Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(evaluation.leadQualityScore)}`}>
                  {evaluation.leadQualityScore.toFixed(1)}
                </div>
                <Progress value={evaluation.leadQualityScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <TrendingUp className="h-4 w-4 mr-2 text-cyan-500" />
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(evaluation.memoryUsageScore)}`}>
                  {evaluation.memoryUsageScore.toFixed(1)}
                </div>
                <Progress value={evaluation.memoryUsageScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Lock className="h-4 w-4 mr-2 text-pink-500" />
                <CardTitle className="text-sm font-medium">Business Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(evaluation.businessRuleScore)}`}>
                  {evaluation.businessRuleScore.toFixed(1)}
                </div>
                <Progress value={evaluation.businessRuleScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Shield className="h-4 w-4 mr-2 text-red-500" />
                <CardTitle className="text-sm font-medium">Safety</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(evaluation.safetyScore)}`}>
                  {evaluation.safetyScore.toFixed(1)}
                </div>
                <Progress value={evaluation.safetyScore} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evaluation.conversationScoring && (
              <Card>
                <CardHeader>
                  <CardTitle>Conversation Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Greeting Score</span>
                    <span className="font-semibold">{evaluation.conversationScoring.greetingScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Flow Score</span>
                    <span className="font-semibold">{evaluation.conversationScoring.conversationFlowScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Question Quality</span>
                    <span className="font-semibold">{evaluation.conversationScoring.questionQualityScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Answer Relevance</span>
                    <span className="font-semibold">{evaluation.conversationScoring.answerRelevanceScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Closing Quality</span>
                    <span className="font-semibold">{evaluation.conversationScoring.closingQualityScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer Experience</span>
                    <span className="font-semibold">{evaluation.conversationScoring.customerExperienceScore.toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {evaluation.confidenceMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Confidence Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Intent Confidence</span>
                    <span className="font-semibold">{(evaluation.confidenceMetrics.intentConfidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Knowledge Confidence</span>
                    <span className="font-semibold">{(evaluation.confidenceMetrics.knowledgeConfidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Decision Confidence</span>
                    <span className="font-semibold">{(evaluation.confidenceMetrics.decisionConfidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conversation Confidence</span>
                    <span className="font-semibold">{(evaluation.confidenceMetrics.conversationConfidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overall Confidence</span>
                    <span className="font-semibold">{(evaluation.confidenceMetrics.overallConfidence * 100).toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identified Issues</CardTitle>
              <CardDescription>
                {evaluation.issues?.length || 0} issue(s) found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {evaluation.issues && evaluation.issues.length > 0 ? (
                <div className="space-y-3">
                  {evaluation.issues.map((issue: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      {issue.severity === 'HIGH' || issue.severity === 'CRITICAL' ? (
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                          <span className="font-medium">{issue.type}</span>
                        </div>
                        <p className="text-sm text-gray-600">{issue.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No issues found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                Suggested improvements based on evaluation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {evaluation.recommendations && evaluation.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {evaluation.recommendations.map((rec: any, index: number) => (
                    <div key={index} className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-blue-500">{rec.priority}</Badge>
                        <span className="font-medium">{rec.category}</span>
                      </div>
                      <p className="text-sm">{rec.recommendation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No recommendations - Performance is good!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
