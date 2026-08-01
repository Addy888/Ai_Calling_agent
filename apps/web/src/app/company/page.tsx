'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Megaphone, Contact, Phone, Bot, FileText, MessageSquare, 
  TrendingUp, Activity, Bell, Plus, Upload, FileCheck, 
  PlayCircle, Clock, CheckCircle2, AlertCircle, Users
} from 'lucide-react';
import { authService } from '@/lib/auth';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  totalContacts: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalCalls: number;
  todaysCalls: number;
  runningCalls: number;
  aiAgents: number;
  totalScripts: number;
  totalPrompts: number;
  successRate: number;
}

interface RecentActivity {
  id: string;
  action: string;
  module: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface RecentCall {
  id: string;
  status: string;
  duration: number;
  contact: {
    fullName: string;
    phone: string;
  };
  campaign: {
    name: string;
  };
  createdAt: string;
}

/**
 * Safely extracts an array from various API response shapes
 * Handles: direct arrays, paginated responses, nested data structures
 */
function safeExtractArray<T>(data: any, limit?: number): T[] {
  let result: T[] = [];
  
  // Case 1: Direct array
  if (Array.isArray(data)) {
    result = data;
  }
  // Case 2: Paginated response with items array { items: [], meta: {} }
  else if (data?.items && Array.isArray(data.items)) {
    result = data.items;
  }
  // Case 3: Nested data array { data: [] }
  else if (data?.data && Array.isArray(data.data)) {
    result = data.data;
  }
  // Case 4: null, undefined, or other non-array values
  else {
    console.warn('⚠️ Unexpected API response shape:', typeof data, data);
    result = [];
  }
  
  // Apply limit if specified
  return limit ? result.slice(0, limit) : result;
}

export default function CompanyDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalCalls: 0,
    todaysCalls: 0,
    runningCalls: 0,
    aiAgents: 0,
    totalScripts: 0,
    totalPrompts: 0,
    successRate: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const user = authService.getUser();
  const companyName = user?.company?.name || 'Your Company';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all stats in parallel
      const [
        contactsRes,
        campaignsRes,
        callsRes,
        scriptsRes,
        promptsRes,
        agentsRes,
        activitiesRes,
        recentCallsRes,
      ] = await Promise.all([
        api.get('/contacts', { params: { limit: 1 } }).catch(() => ({ data: { data: { meta: { total: 0 } } } })),
        api.get('/campaigns', { params: { limit: 1 } }).catch(() => ({ data: { data: { meta: { total: 0 } } } })),
        api.get('/calls', { params: { limit: 1 } }).catch(() => ({ data: { data: { meta: { total: 0 } } } })),
        api.get('/scripts', { params: { limit: 1 } }).catch(() => ({ data: { data: { meta: { total: 0 } } } })),
        api.get('/prompts', { params: { limit: 1 } }).catch(() => ({ data: { data: { meta: { total: 0 } } } })),
        api.get('/ai-agents', { params: { limit: 1 } }).catch(() => ({ data: { data: { length: 0 } } })),
        api.get('/activity-logs', { params: { limit: 5 } }).catch(() => ({ data: { data: { items: [] } } })),
        api.get('/calls', { params: { limit: 5, sortBy: 'createdAt', sortOrder: 'desc' } }).catch(() => ({ data: { data: { items: [] } } })),
      ]);

      // Get active campaigns count
      const activeCampaignsRes = await api.get('/campaigns', { 
        params: { 'filters[status]': ['ACTIVE', 'RUNNING', 'SCHEDULED'] } 
      }).catch(() => ({ data: { data: { meta: { total: 0 } } } }));

      // Get today's calls
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysCallsRes = await api.get('/calls', {
        params: { 'filters[createdAfter]': today.toISOString() }
      }).catch(() => ({ data: { data: { meta: { total: 0 } } } }));

      // Get running calls
      const runningCallsRes = await api.get('/calls', {
        params: { 'filters[status]': 'IN_PROGRESS' }
      }).catch(() => ({ data: { data: { meta: { total: 0 } } } }));

      // Calculate success rate
      const completedCallsRes = await api.get('/calls', {
        params: { 'filters[status]': 'COMPLETED' }
      }).catch(() => ({ data: { data: { meta: { total: 0 } } } }));

      const totalCalls = callsRes.data.data?.meta?.total || 0;
      const completedCalls = completedCallsRes.data.data?.meta?.total || 0;
      const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

      setStats({
        totalContacts: contactsRes.data.data?.meta?.total || 0,
        totalCampaigns: campaignsRes.data.data?.meta?.total || 0,
        activeCampaigns: activeCampaignsRes.data.data?.meta?.total || 0,
        totalCalls: totalCalls,
        todaysCalls: todaysCallsRes.data.data?.meta?.total || 0,
        runningCalls: runningCallsRes.data.data?.meta?.total || 0,
        aiAgents: agentsRes.data.data?.length || 0,
        totalScripts: scriptsRes.data.data?.meta?.total || 0,
        totalPrompts: promptsRes.data.data?.meta?.total || 0,
        successRate: successRate,
      });

      // Safely extract activities and calls using utility function
      const activities = safeExtractArray<RecentActivity>(activitiesRes.data.data, 5);
      const calls = safeExtractArray<RecentCall>(recentCallsRes.data.data, 5);
      
      setRecentActivities(activities);
      setRecentCalls(calls);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Contacts',
      value: stats.totalContacts,
      icon: Contact,
      description: 'In your database',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      href: '/company/contacts',
      change: '+12%',
    },
    {
      title: 'Active Campaigns',
      value: stats.activeCampaigns,
      icon: Megaphone,
      description: `${stats.totalCampaigns} total`,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      href: '/company/campaigns',
      change: '+8%',
    },
    {
      title: 'Running Calls',
      value: stats.runningCalls,
      icon: PlayCircle,
      description: `${stats.todaysCalls} today`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      href: '/company/calls',
      change: 'Live',
      isLive: true,
    },
    {
      title: "Today's Calls",
      value: stats.todaysCalls,
      icon: Phone,
      description: `${stats.totalCalls} total`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      href: '/company/calls',
      change: '+15%',
    },
    {
      title: 'AI Agents',
      value: stats.aiAgents,
      icon: Bot,
      description: 'Active agents',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950',
      href: '/company/ai-agents',
    },
    {
      title: 'Total Scripts',
      value: stats.totalScripts,
      icon: FileText,
      description: 'Available scripts',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950',
      href: '/company/scripts',
    },
    {
      title: 'Total Prompts',
      value: stats.totalPrompts,
      icon: MessageSquare,
      description: 'AI prompts',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-950',
      href: '/company/prompts',
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      description: 'Call success',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      href: '/company/analytics',
    },
  ];

  const quickActions = [
    {
      title: 'Create Campaign',
      description: 'Start a new calling campaign',
      icon: Megaphone,
      href: '/company/campaigns',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      action: 'create',
    },
    {
      title: 'Import Contacts',
      description: 'Upload CSV or Excel file',
      icon: Upload,
      href: '/company/contacts',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      action: 'import',
    },
    {
      title: 'Create Script',
      description: 'Design a new call script',
      icon: FileCheck,
      href: '/company/scripts',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      action: 'create',
    },
    {
      title: 'Create Prompt',
      description: 'New AI prompt template',
      icon: MessageSquare,
      href: '/company/prompts',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      action: 'create',
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      SCHEDULED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">{companyName}</p>
        </div>
        <Button asChild>
          <Link href="/company/campaigns">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">
                    {loading ? (
                      <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                    ) : (
                      stat.value
                    )}
                  </div>
                  {stat.change && (
                    <Badge 
                      variant={stat.isLive ? "default" : "secondary"}
                      className={stat.isLive ? 'animate-pulse bg-red-500' : ''}
                    >
                      {stat.change}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Quick Actions
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="hover:shadow-md transition-all cursor-pointer h-full hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className={`rounded-lg p-3 w-fit mb-3 ${action.bgColor}`}>
                    <action.icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <h4 className="font-semibold mb-1">{action.title}</h4>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity and Calls */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 text-sm">
                    <div className="rounded-full p-2 bg-blue-50 dark:bg-blue-950">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user.firstName} {activity.user.lastName} · {' '}
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/company/settings">View All Activity</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Calls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600" />
              Recent Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentCalls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No calls yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCalls.map((call) => (
                  <div key={call.id} className="flex items-start gap-3 text-sm">
                    <div className="rounded-full p-2 bg-green-50 dark:bg-green-950">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {call.contact?.fullName || 'Unknown Contact'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {call.campaign?.name} · {call.contact?.phone}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={getStatusColor(call.status)}>
                          {call.status}
                        </Badge>
                        {call.duration > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(call.duration)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/company/calls">View All Calls</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Campaign Started</p>
                <p className="text-xs text-muted-foreground">
                  Your campaign "Summer Outreach" is now running with 150 contacts
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">2m ago</span>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
              <Users className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Contacts Imported</p>
                <p className="text-xs text-muted-foreground">
                  Successfully imported 45 new contacts from CSV file
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">1h ago</span>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Low Credit Warning</p>
                <p className="text-xs text-muted-foreground">
                  Your calling credits are running low. Top up to continue campaigns
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">3h ago</span>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full mt-4">
            <Link href="/company/settings">View All Notifications</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
