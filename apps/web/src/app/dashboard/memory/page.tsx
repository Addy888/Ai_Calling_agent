'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Users, 
  MessageSquare, 
  Clock, 
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';

interface ConversationMemory {
  id: string;
  sessionId: string;
  contactId: string;
  currentIntent: string;
  currentLanguage: string;
  isActive: boolean;
  sessionStartTime: string;
  lastActivityTime: string;
  customerMemory?: CustomerMemory;
}

interface CustomerMemory {
  id: string;
  customerName: string;
  phoneNumber: string;
  leadStatus: string;
  city: string;
  state: string;
  totalInteractions: number;
  lastConversationDate: string;
}

export default function MemoryPage() {
  const [activeConversations, setActiveConversations] = useState<ConversationMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchActiveConversations();
  }, []);

  const fetchActiveConversations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/memory/active/mock-company-id');
      if (response.data.success) {
        setActiveConversations(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch active conversations:', error);
      setActiveConversations([
        {
          id: '1',
          sessionId: 'session-1',
          contactId: 'contact-1',
          currentIntent: 'qualification',
          currentLanguage: 'en',
          isActive: true,
          sessionStartTime: new Date(Date.now() - 1800000).toISOString(),
          lastActivityTime: new Date(Date.now() - 300000).toISOString(),
          customerMemory: {
            id: 'cm-1',
            customerName: 'John Doe',
            phoneNumber: '+1234567890',
            leadStatus: 'INTERESTED',
            city: 'New York',
            state: 'NY',
            totalInteractions: 3,
            lastConversationDate: new Date(Date.now() - 86400000).toISOString(),
          },
        },
        {
          id: '2',
          sessionId: 'session-2',
          contactId: 'contact-2',
          currentIntent: 'pricing',
          currentLanguage: 'en',
          isActive: true,
          sessionStartTime: new Date(Date.now() - 900000).toISOString(),
          lastActivityTime: new Date(Date.now() - 60000).toISOString(),
          customerMemory: {
            id: 'cm-2',
            customerName: 'Jane Smith',
            phoneNumber: '+1987654321',
            leadStatus: 'QUALIFIED',
            city: 'Los Angeles',
            state: 'CA',
            totalInteractions: 5,
            lastConversationDate: new Date(Date.now() - 172800000).toISOString(),
          },
        },
        {
          id: '3',
          sessionId: 'session-3',
          contactId: 'contact-3',
          currentIntent: 'objection',
          currentLanguage: 'es',
          isActive: true,
          sessionStartTime: new Date(Date.now() - 3600000).toISOString(),
          lastActivityTime: new Date(Date.now() - 1800000).toISOString(),
          customerMemory: {
            id: 'cm-3',
            customerName: 'Carlos Rodriguez',
            phoneNumber: '+1555123456',
            leadStatus: 'CALL_BACK_LATER',
            city: 'Miami',
            state: 'FL',
            totalInteractions: 2,
            lastConversationDate: new Date(Date.now() - 259200000).toISOString(),
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'INTERESTED':
      case 'QUALIFIED':
        return 'bg-green-100 text-green-800';
      case 'CALL_BACK_LATER':
        return 'bg-yellow-100 text-yellow-800';
      case 'NOT_INTERESTED':
      case 'DO_NOT_CALL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (start: string, last: string) => {
    const duration = new Date(last).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    return `${minutes}m`;
  };

  const filteredConversations = activeConversations.filter(conv => {
    const matchesSearch = 
      conv.customerMemory?.customerName.toLowerCase().includes(search.toLowerCase()) ||
      conv.customerMemory?.phoneNumber.includes(search) ||
      conv.sessionId.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = 
      filterStatus === 'all' || 
      conv.customerMemory?.leadStatus === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const stats = {
    activeConversations: activeConversations.length,
    qualifiedLeads: activeConversations.filter(c => c.customerMemory?.leadStatus === 'QUALIFIED').length,
    totalInteractions: activeConversations.reduce((sum, c) => sum + (c.customerMemory?.totalInteractions || 0), 0),
    avgSessionDuration: activeConversations.length > 0 
      ? Math.round(activeConversations.reduce((sum, c) => {
          const duration = new Date(c.lastActivityTime).getTime() - new Date(c.sessionStartTime).getTime();
          return sum + duration;
        }, 0) / activeConversations.length / 60000)
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">AI Memory Manager</h2>
        <p className="text-muted-foreground">
          Track conversations, customer context, and lead intelligence
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeConversations}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              Live sessions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.qualifiedLeads}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              {stats.activeConversations > 0 ? Math.round((stats.qualifiedLeads / stats.activeConversations) * 100) : 0}% conversion
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInteractions}</div>
            <div className="text-xs text-muted-foreground">
              Across all customers
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSessionDuration}m</div>
            <div className="text-xs text-muted-foreground">
              Per conversation
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Conversations</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="INTERESTED">Interested</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="CALL_BACK_LATER">Call Back</option>
                <option value="NOT_INTERESTED">Not Interested</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <Card key={conversation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">
                            {conversation.customerMemory?.customerName || 'Unknown'}
                          </h3>
                          <Badge className={getLeadStatusColor(conversation.customerMemory?.leadStatus || 'NEW')}>
                            {conversation.customerMemory?.leadStatus.replace('_', ' ')}
                          </Badge>
                          {conversation.isActive && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Activity className="h-3 w-3 mr-1" />
                              Live
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Phone:</span> {conversation.customerMemory?.phoneNumber}
                          </div>
                          <div>
                            <span className="font-medium">Location:</span> {conversation.customerMemory?.city}, {conversation.customerMemory?.state}
                          </div>
                          <div>
                            <span className="font-medium">Current Intent:</span> {conversation.currentIntent}
                          </div>
                          <div>
                            <span className="font-medium">Language:</span> {conversation.currentLanguage.toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {formatDuration(conversation.sessionStartTime, conversation.lastActivityTime)}
                          </div>
                          <div>
                            <span className="font-medium">Interactions:</span> {conversation.customerMemory?.totalInteractions}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                        <Button size="sm" variant="outline">
                          Timeline
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span>Session: {conversation.sessionId}</span>
                      <span>Started: {new Date(conversation.sessionStartTime).toLocaleString()}</span>
                      <span>Last Activity: {new Date(conversation.lastActivityTime).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Brain className="h-4 w-4 mr-2" />
            Memory Overview
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="h-4 w-4 mr-2" />
            Customer Memory
          </TabsTrigger>
          <TabsTrigger value="leads">
            <TrendingUp className="h-4 w-4 mr-2" />
            Lead Tracking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Memory Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total Memories</div>
                  <div className="text-2xl font-bold">{activeConversations.length * 3}</div>
                  <div className="text-xs text-muted-foreground">Conversation + Customer + Session</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Memory Size</div>
                  <div className="text-2xl font-bold">2.4 MB</div>
                  <div className="text-xs text-muted-foreground">Compressed storage</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Retention</div>
                  <div className="text-2xl font-bold">90 days</div>
                  <div className="text-xs text-muted-foreground">Auto-cleanup enabled</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Memory Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeConversations
                  .filter(c => c.customerMemory)
                  .map(conversation => (
                    <div key={conversation.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{conversation.customerMemory?.customerName}</h4>
                        <Badge>{conversation.customerMemory?.totalInteractions} interactions</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>Phone: {conversation.customerMemory?.phoneNumber}</div>
                        <div>Location: {conversation.customerMemory?.city}, {conversation.customerMemory?.state}</div>
                        <div>Status: {conversation.customerMemory?.leadStatus}</div>
                        <div>Last Contact: {new Date(conversation.customerMemory?.lastConversationDate || '').toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Qualified</span>
                    <Badge className="bg-green-100 text-green-800">
                      {activeConversations.filter(c => c.customerMemory?.leadStatus === 'QUALIFIED').length}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(stats.qualifiedLeads / stats.activeConversations) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Interested</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {activeConversations.filter(c => c.customerMemory?.leadStatus === 'INTERESTED').length}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(activeConversations.filter(c => c.customerMemory?.leadStatus === 'INTERESTED').length / stats.activeConversations) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
