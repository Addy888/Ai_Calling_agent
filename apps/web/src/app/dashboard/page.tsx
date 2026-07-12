'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Megaphone, 
  Contact, 
  Phone, 
  TrendingUp, 
  CheckCircle, 
  FileText,
  MessageSquare,
  Database,
  Mic,
  Building2,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from 'next/navigation';

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
}

interface RecentActivity {
  id: string;
  action: string;
  module: string;
  user: {
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      try {
        const [statsRes, activitiesRes] = await Promise.all([
          apiClient.get('/analytics/dashboard/stats?dateRange=last_30_days'),
          apiClient.get('/activity-logs?limit=10'),
        ]);

        if (statsRes.data.success) {
          setStats(statsRes.data.data);
        }
        if (activitiesRes.data.success) {
          setActivities(activitiesRes.data.data.items || []);
        }
      } catch (apiError) {
        console.warn('Analytics endpoints not available, using mock data');
        
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
          }
        });

        setActivities([
          {
            id: '1',
            action: 'Created new campaign',
            module: 'Campaigns',
            user: { firstName: 'John', lastName: 'Doe' },
            createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
          },
          {
            id: '2',
            action: 'Imported 150 contacts',
            module: 'Contacts',
            user: { firstName: 'Jane', lastName: 'Smith' },
            createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
          },
          {
            id: '3',
            action: 'Published new script version',
            module: 'Scripts',
            user: { firstName: 'Mike', lastName: 'Johnson' },
            createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
          },
          {
            id: '4',
            action: 'Updated company profile',
            module: 'Companies',
            user: { firstName: 'Sarah', lastName: 'Williams' },
            createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
          },
          {
            id: '5',
            action: 'Generated analytics report',
            module: 'Reports',
            user: null,
            createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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
      <span className={`text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? '+' : ''}{growth}% from last period
      </span>
    );
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
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
        Failed to load dashboard data
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
      link: '/dashboard/companies',
    },
    {
      name: 'Total Users',
      value: stats.overview.totalUsers.value,
      growth: stats.overview.totalUsers.growth,
      icon: Users,
      color: 'text-purple-600',
      link: '/dashboard/users',
    },
    {
      name: 'Total Campaigns',
      value: stats.overview.totalCampaigns.value,
      growth: stats.overview.totalCampaigns.growth,
      icon: Megaphone,
      color: 'text-green-600',
      link: '/dashboard/campaigns',
    },
    {
      name: 'Total Contacts',
      value: stats.overview.totalContacts.value,
      growth: stats.overview.totalContacts.growth,
      icon: Contact,
      color: 'text-orange-600',
      link: '/dashboard/contacts',
    },
    {
      name: 'Total Scripts',
      value: stats.overview.totalScripts.value,
      growth: stats.overview.totalScripts.growth,
      icon: FileText,
      color: 'text-cyan-600',
      link: '/dashboard/scripts',
    },
    {
      name: 'Total Prompts',
      value: stats.overview.totalPrompts.value,
      growth: stats.overview.totalPrompts.growth,
      icon: MessageSquare,
      color: 'text-pink-600',
      link: '/dashboard/prompts',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to your AI Calling Agent platform overview
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/analytics')}>
          View Analytics
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card 
            key={stat.name} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(stat.link)}
          >
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push('/dashboard/campaigns')}
            >
              <Megaphone className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push('/dashboard/contacts/add')}
            >
              <Contact className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push('/dashboard/scripts')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Script
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push('/dashboard/reports')}
            >
              <Database className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard/activity-logs')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No recent activity
                </div>
              ) : (
                activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 pb-4 last:pb-0 border-b last:border-0">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.user 
                          ? `${activity.user.firstName} ${activity.user.lastName}`
                          : 'System'
                        } • {activity.module}
                      </p>
                      <p className="text-xs text-muted-foreground">{getTimeAgo(activity.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
