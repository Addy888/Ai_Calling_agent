'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  Users,
  MessageSquare,
  AlertCircle,
  ThumbsUp,
  Search,
  Filter,
  BarChart3,
  FileText,
  Lightbulb,
  Target,
} from 'lucide-react';

export default function ConversationIntelligencePage() {
  const router = useRouter();
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [qualityFilter, setQualityFilter] = useState<string>('all');

  useEffect(() => {
    fetchDashboardStats();
    fetchAnalyses();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/v1/conversation-intelligence/dashboard', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setDashboardStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: '1',
        limit: '10',
        ...(qualityFilter !== 'all' && { overallQuality: qualityFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/v1/conversation-intelligence/analysis?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const result = await response.json();
      setAnalyses(result.data || []);
    } catch (error) {
      console.error('Error fetching analyses:', error);
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            Conversation Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyze conversations, understand customer behavior, and improve sales performance
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/conversation-intelligence/analytics')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          View Analytics
        </Button>
      </div>

      {/* Dashboard Statistics Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                Total Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalConversations}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboardStats.successfulConversations} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                Qualified Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.qualifiedLeads}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Hot, Warm & Qualified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Avg. Conversation Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(dashboardStats.averageConversationScore)}`}>
                {dashboardStats.averageConversationScore.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Out of 100
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-600" />
                Quality Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats.conversationQualityScore.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Conversation quality rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Insights */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Most Common Intent</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-lg">
                {dashboardStats.mostCommonIntent}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Most Common Objection</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-lg">
                {dashboardStats.mostCommonObjection}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Top Performing Response</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-lg">
                {dashboardStats.topPerformingResponse}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs Navigation */}
      <Tabs defaultValue="conversations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conversations">
            <MessageSquare className="mr-2 h-4 w-4" />
            Conversations
          </TabsTrigger>
          <TabsTrigger value="objections">
            <AlertCircle className="mr-2 h-4 w-4" />
            Objections
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <Lightbulb className="mr-2 h-4 w-4" />
            Knowledge Builder
          </TabsTrigger>
          <TabsTrigger value="questions">
            <FileText className="mr-2 h-4 w-4" />
            Question Library
          </TabsTrigger>
        </TabsList>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Conversation Analysis</CardTitle>
              <CardDescription>
                View and analyze processed conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={qualityFilter} onValueChange={setQualityFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quality</SelectItem>
                    <SelectItem value="EXCELLENT">Excellent</SelectItem>
                    <SelectItem value="GOOD">Good</SelectItem>
                    <SelectItem value="AVERAGE">Average</SelectItem>
                    <SelectItem value="POOR">Poor</SelectItem>
                    <SelectItem value="VERY_POOR">Very Poor</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={fetchAnalyses}>
                  <Filter className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
              </div>

              {/* Conversations List */}
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : analyses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No conversations found. Process some dataset records first.
                  </div>
                ) : (
                  analyses.map((analysis) => (
                    <Card
                      key={analysis.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() =>
                        router.push(`/dashboard/conversation-intelligence/${analysis.id}`)
                      }
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge className={getQualityColor(analysis.overallQuality)}>
                                {analysis.overallQuality}
                              </Badge>
                              <Badge variant="outline">{analysis.sentimentLabel}</Badge>
                              <Badge variant="secondary">{analysis.dominantEmotion}</Badge>
                            </div>
                            <div className="grid grid-cols-6 gap-4 mt-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Overall</p>
                                <p className={`text-lg font-bold ${getScoreColor(analysis.conversationScore)}`}>
                                  {analysis.conversationScore.toFixed(1)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Professional</p>
                                <p className="text-lg font-semibold">
                                  {analysis.professionalScore.toFixed(1)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Naturalness</p>
                                <p className="text-lg font-semibold">
                                  {analysis.naturalnessScore.toFixed(1)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Confidence</p>
                                <p className="text-lg font-semibold">
                                  {analysis.confidenceScore.toFixed(1)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Sales</p>
                                <p className="text-lg font-semibold">
                                  {analysis.salesScore.toFixed(1)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Closing</p>
                                <p className="text-lg font-semibold">
                                  {analysis.closingScore.toFixed(1)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs - simplified for now, will be redirects */}
        <TabsContent value="objections">
          <Card>
            <CardHeader>
              <CardTitle>Objection Analysis</CardTitle>
              <CardDescription>
                Understand and resolve customer objections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() =>
                  router.push('/dashboard/conversation-intelligence/objections')
                }
              >
                View Objection Analysis
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Builder</CardTitle>
              <CardDescription>
                AI-generated knowledge base from conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push('/dashboard/conversation-intelligence/knowledge')}
              >
                View Knowledge Base
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Question Library</CardTitle>
              <CardDescription>
                Frequently asked questions and successful answers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push('/dashboard/conversation-intelligence/questions')}
              >
                View Question Library
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
