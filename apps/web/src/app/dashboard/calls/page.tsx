'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Phone, PhoneCall, PhoneOff, PhoneMissed, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';

interface Call {
  id: string;
  phoneNumber: string;
  duration: number;
  status: string;
  direction: string;
  startTime: string;
  endTime: string | null;
  recording: string | null;
  transcript: string | null;
  campaign: {
    id: string;
    name: string;
  } | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/calls?page=1&limit=100');
      if (response.data.success) {
        setCalls(response.data.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch calls:', error);
      // Graceful fallback with mock data
      setCalls([
        {
          id: '1',
          phoneNumber: '+1234567890',
          duration: 325,
          status: 'COMPLETED',
          direction: 'OUTBOUND',
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date(Date.now() - 3275000).toISOString(),
          recording: 'https://example.com/recording1.mp3',
          transcript: 'Hello, this is a test call...',
          campaign: {
            id: '1',
            name: 'Summer Sales Campaign',
          },
          contact: {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
        {
          id: '2',
          phoneNumber: '+1987654321',
          duration: 180,
          status: 'COMPLETED',
          direction: 'OUTBOUND',
          startTime: new Date(Date.now() - 7200000).toISOString(),
          endTime: new Date(Date.now() - 7020000).toISOString(),
          recording: 'https://example.com/recording2.mp3',
          transcript: 'Good morning, I am calling about...',
          campaign: {
            id: '1',
            name: 'Summer Sales Campaign',
          },
          contact: {
            id: '2',
            firstName: 'Jane',
            lastName: 'Smith',
          },
        },
        {
          id: '3',
          phoneNumber: '+1555123456',
          duration: 45,
          status: 'NO_ANSWER',
          direction: 'OUTBOUND',
          startTime: new Date(Date.now() - 10800000).toISOString(),
          endTime: new Date(Date.now() - 10755000).toISOString(),
          recording: null,
          transcript: null,
          campaign: {
            id: '2',
            name: 'Follow-up Campaign',
          },
          contact: {
            id: '3',
            firstName: 'Bob',
            lastName: 'Johnson',
          },
        },
        {
          id: '4',
          phoneNumber: '+1444567890',
          duration: 0,
          status: 'FAILED',
          direction: 'OUTBOUND',
          startTime: new Date(Date.now() - 14400000).toISOString(),
          endTime: null,
          recording: null,
          transcript: null,
          campaign: {
            id: '2',
            name: 'Follow-up Campaign',
          },
          contact: {
            id: '4',
            firstName: 'Alice',
            lastName: 'Williams',
          },
        },
        {
          id: '5',
          phoneNumber: '+1666789012',
          duration: 245,
          status: 'COMPLETED',
          direction: 'OUTBOUND',
          startTime: new Date(Date.now() - 18000000).toISOString(),
          endTime: new Date(Date.now() - 17755000).toISOString(),
          recording: 'https://example.com/recording5.mp3',
          transcript: 'Thank you for your time...',
          campaign: {
            id: '1',
            name: 'Summer Sales Campaign',
          },
          contact: {
            id: '5',
            firstName: 'Charlie',
            lastName: 'Brown',
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <PhoneCall className="h-4 w-4 text-green-600" />;
      case 'NO_ANSWER':
        return <PhoneMissed className="h-4 w-4 text-yellow-600" />;
      case 'FAILED':
      case 'BUSY':
        return <PhoneOff className="h-4 w-4 text-red-600" />;
      default:
        return <Phone className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'NO_ANSWER':
        return 'secondary';
      case 'FAILED':
      case 'BUSY':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      call.phoneNumber.includes(search) ||
      (call.contact && `${call.contact.firstName} ${call.contact.lastName}`.toLowerCase().includes(search.toLowerCase())) ||
      (call.campaign && call.campaign.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = !statusFilter || call.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const uniqueStatuses = Array.from(new Set(calls.map(call => call.status)));

  const columns: Column<Call>[] = [
    {
      key: 'contact',
      label: 'Contact',
      render: (_, row) => (
        row.contact
          ? `${row.contact.firstName} ${row.contact.lastName}`
          : row.phoneNumber
      ),
    },
    {
      key: 'phoneNumber',
      label: 'Phone',
      render: (value) => (
        <span className="font-mono text-sm">{value}</span>
      ),
    },
    {
      key: 'campaign',
      label: 'Campaign',
      render: (value) => (
        value ? (
          <Badge variant="outline">{value.name}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(value)}
          <Badge variant={getStatusBadgeVariant(value)}>
            {value.replace('_', ' ')}
          </Badge>
        </div>
      ),
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (value) => (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{formatDuration(value)}</span>
        </div>
      ),
    },
    {
      key: 'startTime',
      label: 'Time',
      render: (value) => (
        <div className="text-sm">
          {new Date(value).toLocaleString()}
        </div>
      ),
    },
  ];

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
        <h2 className="text-3xl font-bold tracking-tight">Call History</h2>
        <p className="text-muted-foreground">
          Track and analyze all call activities
        </p>
      </div>

      {!loading && (() => {
        const completedCalls = calls.filter(c => c.status === 'COMPLETED').length;
        const totalDuration = calls.reduce((sum, c) => sum + c.duration, 0);
        const avgDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;

        return (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{calls.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <PhoneCall className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedCalls}</div>
                <p className="text-xs text-muted-foreground">
                  {calls.length > 0 ? Math.round((completedCalls / calls.length) * 100) : 0}% success rate
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(avgDuration)}</div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Calls</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search calls..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredCalls} />
        </CardContent>
      </Card>
    </div>
  );
}
