'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Monitor, 
  Activity, 
  Search, 
  Filter,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface TrainingSession {
  id: string;
  sessionName: string;
  sessionIdentifier: string;
  status: string;
  queueStatus: string;
  startedAt?: string;
  estimatedDurationHours?: number;
  datasetId: string;
  modelRegistryId: string;
  createdAt: string;
}

export default function TrainingMonitorListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTrainingSessions();
  }, []);

  const fetchTrainingSessions = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/training-manager/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(response.data || []);
    } catch (error) {
      console.error('Error fetching training sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'READY':
      case 'WAITING':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'PAUSED':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILED':
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'READY': 'default',
      'WAITING': 'default',
      'COMPLETED': 'default',
      'FAILED': 'destructive',
      'CANCELLED': 'secondary',
      'PAUSED': 'outline',
    };
    return variants[status] || 'secondary';
  };

  const filteredSessions = sessions.filter(session =>
    session.sessionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.sessionIdentifier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Monitor className="h-8 w-8" />
            Training Monitor
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage AI model training sessions in real-time
          </p>
        </div>
        <Button onClick={fetchTrainingSessions}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search training sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">
              {filteredSessions.length} sessions
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading training sessions...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Training Sessions Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'No sessions match your search criteria'
                : 'Create a training session to start monitoring'}
            </p>
            <Button onClick={() => router.push('/dashboard/training')}>
              Go to Training Center
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session) => (
            <Card
              key={session.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/dashboard/training/monitor/${session.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{session.sessionName}</CardTitle>
                    <CardDescription className="font-mono text-xs mt-1">
                      {session.sessionIdentifier}
                    </CardDescription>
                  </div>
                  {getStatusIcon(session.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={getStatusBadge(session.status)}>
                    {session.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Queue</span>
                  <Badge variant="outline">{session.queueStatus}</Badge>
                </div>
                {session.startedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Started</span>
                    <span className="text-xs">
                      {new Date(session.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {session.estimatedDurationHours && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="text-xs">
                      ~{session.estimatedDurationHours}h
                    </span>
                  </div>
                )}
                <Button className="w-full mt-4" size="sm">
                  <Monitor className="h-4 w-4 mr-2" />
                  Open Monitor
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Training Monitor</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            The Training Monitor provides real-time visibility into AI model training processes.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Monitor training progress, metrics, and performance</li>
            <li>Track resource usage (GPU, RAM, CPU)</li>
            <li>View live training logs and timeline events</li>
            <li>Receive alerts for critical training events</li>
            <li>Export logs for analysis and reporting</li>
          </ul>
          <p className="pt-2">
            <strong>Note:</strong> Currently displays mock data. Actual metrics will be available
            when the training engine is integrated.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
