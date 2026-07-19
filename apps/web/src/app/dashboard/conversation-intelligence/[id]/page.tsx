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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  MessageSquare,
  Brain,
  Target,
  TrendingUp,
  AlertTriangle,
  Smile,
  Clock,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

export default function ConversationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const analysisId = params?.id as string;

  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (analysisId) {
      fetchAnalysis();
    }
  }, [analysisId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/conversation-intelligence/analysis/${analysisId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'EXCELLENT':
        return 'bg-green-500';
      case 'GOOD':
        return 'bg-blue-500';
      case 'AVERAGE':
        return 'bg-yellow-500';
      case 'POOR':
        return 'bg-orange-500';
      case 'VERY_POOR':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 65) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPhaseIcon = (phase: string) => {
    const icons: any = {
      GREETING: '👋',
      INTRODUCTION: '🤝',
      REQUIREMENT_GATHERING: '📋',
      DISCOVERY: '🔍',
      PITCH: '💼',
      OBJECTION: '⚠️',
      NEGOTIATION: '🤝',
      CLOSING: '✅',
      FOLLOW_UP: '📞',
      FAREWELL: '👋',
    };
    return icons[phase] || '💬';
  };

  const getLeadCategoryColor = (category: string) => {
    switch (category) {
      case 'HOT_LEAD':
        return 'bg-red-500';
      case 'WARM_LEAD':
        return 'bg-orange-500';
      case 'QUALIFIED':
        return 'bg-blue-500';
      case 'COLD_LEAD':
        return 'bg-gray-500';
      case 'REJECTED':
        return 'bg-slate-700';
      default:
        return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading analysis...</div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Analysis not found</p>
          <Button
            className="mt-4"
            onClick={() => router.push('/dashboard/conversation-intelligence')}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/conversation-intelligence')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-purple-600" />
              Conversation Analysis
            </h1>
            <p className="text-muted-foreground mt-1">
              Detailed analysis and insights
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={getQualityColor(analysis.overallQuality)}>
            {analysis.overallQuality}
          </Badge>
          <Badge variant="outline">{analysis.sentimentLabel}</Badge>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(analysis.conversationScore)}`}>
              {analysis.conversationScore.toFixed(1)}
            </div>
            <Progress value={analysis.conversationScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Professional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analysis.professionalScore.toFixed(1)}</div>
            <Progress value={analysis.professionalScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Naturalness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analysis.naturalnessScore.toFixed(1)}</div>
            <Progress value={analysis.naturalnessScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analysis.confidenceScore.toFixed(1)}</div>
            <Progress value={analysis.confidenceScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analysis.salesScore.toFixed(1)}</div>
            <Progress value={analysis.salesScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Closing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analysis.closingScore.toFixed(1)}</div>
            <Progress value={analysis.closingScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Lead Score */}
      {analysis.leadScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Lead Scoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div>
                <Badge className={getLeadCategoryColor(analysis.leadScore.leadCategory)}>
                  {analysis.leadScore.leadCategory.replace('_', ' ')}
                </Badge>
                <p className="text-3xl font-bold mt-2">
                  {analysis.leadScore.score.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">Lead Score</p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Recommended Action:</p>
                <p className="text-lg">{analysis.leadScore.recommendedAction}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-2xl font-bold">
                  {(analysis.leadScore.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">
            <Clock className="mr-2 h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="intents">
            <TrendingUp className="mr-2 h-4 w-4" />
            Intents
          </TabsTrigger>
          <TabsTrigger value="entities">
            <MessageSquare className="mr-2 h-4 w-4" />
            Entities
          </TabsTrigger>
          <TabsTrigger value="objections">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Objections
          </TabsTrigger>
          <TabsTrigger value="emotions">
            <Smile className="mr-2 h-4 w-4" />
            Emotions
          </TabsTrigger>
          <TabsTrigger value="responses">
            <ThumbsUp className="mr-2 h-4 w-4" />
            Responses
          </TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Flow Timeline</CardTitle>
              <CardDescription>
                Chronological breakdown of conversation phases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.timeline && analysis.timeline.length > 0 ? (
                  analysis.timeline.map((item: any, index: number) => (
                    <div key={item.id} className="flex gap-4 border-l-2 border-border pl-4 pb-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {getPhaseIcon(item.phase)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{item.phase.replace('_', ' ')}</Badge>
                          <Badge variant="secondary">{item.speaker}</Badge>
                        </div>
                        <p className="text-sm">{item.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No timeline data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intents Tab */}
        <TabsContent value="intents">
          <Card>
            <CardHeader>
              <CardTitle>Detected Intents</CardTitle>
              <CardDescription>
                Customer intents identified during the conversation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.intents && analysis.intents.length > 0 ? (
                  analysis.intents.map((intent: any) => (
                    <div key={intent.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <Badge>{intent.intentType}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">{intent.context}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {(intent.confidence * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No intents detected
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entities Tab */}
        <TabsContent value="entities">
          <Card>
            <CardHeader>
              <CardTitle>Extracted Entities</CardTitle>
              <CardDescription>
                Key information extracted from the conversation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.entities && analysis.entities.length > 0 ? (
                  analysis.entities.map((entity: any) => (
                    <div key={entity.id} className="p-3 border rounded-lg">
                      <Badge variant="outline" className="mb-2">
                        {entity.entityType}
                      </Badge>
                      <p className="font-medium">{entity.entityValue}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confidence: {(entity.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="col-span-2 text-center text-muted-foreground py-8">
                    No entities extracted
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Objections Tab */}
        <TabsContent value="objections">
          <Card>
            <CardHeader>
              <CardTitle>Customer Objections</CardTitle>
              <CardDescription>
                Objections raised and agent responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.objections && analysis.objections.length > 0 ? (
                  analysis.objections.map((objection: any) => (
                    <div key={objection.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant="destructive">{objection.objectionType.replace('_', ' ')}</Badge>
                        {objection.wasResolved ? (
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="mr-1 h-3 w-3" />
                            Unresolved
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Customer:</p>
                          <p className="text-sm">{objection.objectionText}</p>
                        </div>
                        {objection.agentResponse && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Agent Response:</p>
                            <p className="text-sm">{objection.agentResponse}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Resolution Score</p>
                            <p className="text-lg font-bold">{objection.resolutionScore}</p>
                          </div>
                          <Progress value={objection.resolutionScore} className="flex-1" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No objections detected
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emotions Tab */}
        <TabsContent value="emotions">
          <Card>
            <CardHeader>
              <CardTitle>Customer Emotions</CardTitle>
              <CardDescription>
                Emotional state throughout the conversation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {analysis.emotions && analysis.emotions.length > 0 ? (
                  analysis.emotions.map((emotion: any) => (
                    <div key={emotion.id} className="p-3 border rounded-lg text-center">
                      <p className="text-2xl mb-2">
                        {emotion.emotionType === 'HAPPY' && '😊'}
                        {emotion.emotionType === 'NEUTRAL' && '😐'}
                        {emotion.emotionType === 'CONFUSED' && '😕'}
                        {emotion.emotionType === 'EXCITED' && '🤩'}
                        {emotion.emotionType === 'INTERESTED' && '🤔'}
                        {emotion.emotionType === 'FRUSTRATED' && '😤'}
                        {emotion.emotionType === 'ANGRY' && '😠'}
                        {emotion.emotionType === 'BUSY' && '⏱️'}
                        {emotion.emotionType === 'SILENT' && '🤐'}
                      </p>
                      <Badge variant="outline">{emotion.emotionType}</Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        Intensity: {(emotion.intensity * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-center text-muted-foreground py-8">
                    No emotions detected
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Responses Tab */}
        <TabsContent value="responses">
          <Card>
            <CardHeader>
              <CardTitle>Agent Response Effectiveness</CardTitle>
              <CardDescription>
                Analysis of agent responses and their impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.responseScores && analysis.responseScores.length > 0 ? (
                  analysis.responseScores.map((response: any) => (
                    <div key={response.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <Badge>{response.responseType.replace('_', ' ')}</Badge>
                        <div className="flex items-center gap-2">
                          {response.customerReaction === 'POSITIVE' && (
                            <ThumbsUp className="h-4 w-4 text-green-600" />
                          )}
                          {response.customerReaction === 'NEGATIVE' && (
                            <ThumbsDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">{response.customerReaction}</span>
                        </div>
                      </div>
                      <p className="text-sm mb-3">{response.agentText}</p>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Effectiveness</p>
                          <p className="text-lg font-bold">{response.effectivenessScore}</p>
                        </div>
                        <Progress value={response.effectivenessScore} className="flex-1" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No response scores available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
