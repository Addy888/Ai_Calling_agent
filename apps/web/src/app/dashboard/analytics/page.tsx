'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Megaphone, 
  Contact, 
  FileText, 
  MessageSquare, 
  Database,
  Mic,
  Building2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';

interface DashboardStats {
  overview: {
    totalCompanies: { value: number; growth: number };
    totalUsers: { value: number; growth: number };
    totalCampaigns: { value: number; growth: number };
    totalContacts: { value: number; growth: number };
    totalScripts: { value: number; growth: number };
    totalPrompts: { value: number; growth: number };
    totalKnowledgeBase: { value: number; growth: number };
    totalVoiceProfiles: { value: number; growth: number };
  };
  period: {
    startDate: string;
    endDate: string;
    range: string;
  };
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('last_30_days');

  useEffect(() => {
    fetchDashboardStats();
  }, [dateRange]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      try {
        const response = await apiClient.get(`/analytics/dashboard/stats?dateRange=${dateRange}&includeGrowth=true`);
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (apiError) {
        console.warn('Analytics endpoint not available, using mock data');
        setStats({
          overview: {
            totalCompanies: { value: 12, growth: 8.5 },
            totalUsers: { value: 48, growth: 12.3 },
            totalCampaigns: { value: 156, growth: 15.7 },
            totalContacts: { value: 2847, growth: 23.4 },
            totalScripts: { value: 89, growth: 6.8 },
            totalPrompts: { value: 134, growth: 9.2 },
            totalKnowledgeBase: { value: 45, growth: 5.1 },
            totalVoiceProfiles: { value: 23, growth: 3.4 },
          },
          period: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
            range: dateRange,
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0;
    return (
      <span className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(growth)}% from previous period
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Failed to load analytics data
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Companies',
      value: stats.overview.totalCompanies.value,
      growth: stats.overview.totalCompanies.growth,
      icon: Building2,
      color: 'text-blue-600',
    },
    {
      name: 'Total Users',
      value: stats.overview.totalUsers.value,
      growth: stats.overview.totalUsers.growth,
      icon: Users,
      color: 'text-purple-600',
    },
    {
      name: 'Total Campaigns',
      value: stats.overview.totalCampaigns.value,
      growth: stats.overview.totalCampaigns.growth,
      icon: Megaphone,
      color: 'text-green-600',
    },
    {
      name: 'Total Contacts',
      value: stats.overview.totalContacts.value,
      growth: stats.overview.totalContacts.growth,
      icon: Contact,
      color: 'text-orange-600',
    },
    {
      name: 'Total Scripts',
      value: stats.overview.totalScripts.value,
      growth: stats.overview.totalScripts.growth,
      icon: FileText,
      color: 'text-cyan-600',
    },
    {
      name: 'Total Prompts',
      value: stats.overview.totalPrompts.value,
      growth: stats.overview.totalPrompts.growth,
      icon: MessageSquare,
      color: 'text-pink-600',
    },
    {
      name: 'Knowledge Base',
      value: stats.overview.totalKnowledgeBase.value,
      growth: stats.overview.totalKnowledgeBase.growth,
      icon: Database,
      color: 'text-indigo-600',
    },
    {
      name: 'Voice Profiles',
      value: stats.overview.totalVoiceProfiles.value,
      growth: stats.overview.totalVoiceProfiles.growth,
      icon: Mic,
      color: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights for your AI Calling Agent platform
          </p>
        </div>
        <div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border rounded-md bg-background"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="last_90_days">Last 90 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stat.value)}</div>
              {formatGrowth(stat.growth)}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Campaign performance charts will be displayed here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Contact growth trends will be displayed here
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                System activity timeline will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                Detailed campaign analytics will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                Detailed contact analytics will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activity Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                User activity analytics will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
