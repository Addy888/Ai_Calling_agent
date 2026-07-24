'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PhoneCall,
  Calendar,
  BarChart3,
  Users,
} from 'lucide-react';

interface ConversationSession {
  id: string;
  sessionId: string;
  currentState: string;
  startedAt: string;
  lastActivityAt: string;
  isActive: boolean;
  conversationResult?: string;
}

interface ConversationStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  completionRate: number;
}

export default function ConversationManagerPage() {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const companyId = localStorage.getItem('companyId');

      const [sessionsRes, statsRes] = await Promise.all([
        fetch(`/api/conversation-manager/sessions?companyId=${companyId}&limit=10`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }),
        fetch(`/api/conversation-manager/sessions/stats?companyId=${companyId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }),
      ]);

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.data || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading conversation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    const colors: Record<string, string> = {
      GREETING: 'bg-blue-500',
      INTRODUCTION: 'bg-cyan-500',
      QUALIFICATION: 'bg-purple-500',
      INFORMATION_COLLECTION: 'bg-indigo-500',
      KNOWLEDGE_LOOKUP: 'bg-yellow-500',
      OBJECTION_HANDLING: 'bg-orange-500',
      LEAD_QUALIFICATION: 'bg-green-500',
      APPOINTMENT_OFFER: 'bg-teal-500',
      FOLLOW_UP: 'bg-pink-500',
      CLOSING: 'bg-gray-500',
      COMPLETED: 'bg-green-600',
      CANCELLED: 'bg-red-500',
    };
    return colors[state] || 'bg-gray-400';
  };

  const getResultBadge = (result?: string) => {
    if (!result) return null;

    const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      INTERESTED: 'default',
      NOT_INTERESTED: 'destructive',
      CALLBACK_SCHEDULED: 'secondary',
      COMPLETED: 'outline',
    };

    return (
      <Badge variant={variants[result] || 'outline'}>
        {result.replace(/_/g, ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conversation Manager</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor all conversation flows
          </p>
        </div>
        <Button onClick={loadData}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-gray-600 mt-1">All conversation sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <PhoneCall className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.completed || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats?.completionRate ? `${stats.completionRate.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-gray-600 mt-1">Success percentage</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active Sessions</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversation Sessions</CardTitle>
              <CardDescription>Latest conversation activity across all campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No conversation sessions found</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-3 h-3 rounded-full ${getStateColor(session.currentState)}`}
                        ></div>
                        <div>
                          <p className="font-medium">Session {session.sessionId.slice(0, 8)}</p>
                          <p className="text-sm text-gray-600">
                            State: {session.currentState.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {new Date(session.startedAt).toLocaleString()}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(session.lastActivityAt).toLocaleTimeString()}
                          </div>
                        </div>
                        {session.isActive ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          getResultBadge(session.conversationResult)
                        )}
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Conversations</CardTitle>
              <CardDescription>Currently ongoing conversation sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.filter((s) => s.isActive).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <PhoneCall className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No active conversations at the moment</p>
                  </div>
                ) : (
                  sessions
                    .filter((s) => s.isActive)
                    .map((session) => (
                      <div
                        key={session.id}
                        className="p-4 border rounded-lg bg-green-50 border-green-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Session {session.sessionId.slice(0, 8)}</p>
                            <Badge className={getStateColor(session.currentState)}>
                              {session.currentState.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <Button size="sm">Monitor</Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Timeline</CardTitle>
              <CardDescription>View conversation flow and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Select a session to view its timeline</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Conversation Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Sessions</span>
                    <span className="font-bold">{stats?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="font-bold text-green-600">{stats?.completed || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cancelled</span>
                    <span className="font-bold text-red-600">{stats?.cancelled || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="font-bold text-blue-600">
                      {stats?.completionRate ? `${stats.completionRate.toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>State Distribution</CardTitle>
                <CardDescription>Current conversation states</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Analytics visualization coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
