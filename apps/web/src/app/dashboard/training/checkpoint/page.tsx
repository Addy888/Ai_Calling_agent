'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Save,
  Search,
  Plus,
  Eye,
  Settings,
  Filter,
  CheckCircle,
  Clock,
  Shield,
  Database,
  RefreshCw,
} from 'lucide-react';

interface CheckpointConfig {
  id: string;
  name: string;
  description?: string;
  saveStrategy: string;
  recoveryStrategy: string;
  maxCheckpoints: number;
  retentionDays: number;
  status: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

interface Statistics {
  total: number;
  validated: number;
  byStatus: Record<string, number>;
  bySaveStrategy: Record<string, number>;
  byRecoveryStrategy: Record<string, number>;
}

export default function CheckpointDashboardPage() {
  const router = useRouter();
  const [configurations, setConfigurations] = useState<CheckpointConfig[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [strategyFilter, setStrategyFilter] = useState('all');

  useEffect(() => {
    fetchConfigurations();
    fetchStatistics();
  }, [statusFilter, strategyFilter]);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (strategyFilter !== 'all') params.append('saveStrategy', strategyFilter);

      const response = await fetch(`/api/training/checkpoint-configs?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        let data = result.data || [];

        if (search) {
          data = data.filter(
            (c: CheckpointConfig) =>
              c.name.toLowerCase().includes(search.toLowerCase()) ||
              c.description?.toLowerCase().includes(search.toLowerCase()),
          );
        }

        setConfigurations(data);
      }
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/training/checkpoint-configs/statistics', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      DRAFT: { variant: 'secondary', label: 'Draft', icon: Clock },
      READY: { variant: 'default', label: 'Ready', icon: CheckCircle },
      VALIDATED: { variant: 'default', label: 'Validated', icon: CheckCircle },
      ARCHIVED: { variant: 'secondary', label: 'Archived', icon: Database },
    };

    const config = variants[status] || { variant: 'secondary', label: status, icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getSaveStrategyBadge = (strategy: string) => {
    const labels: Record<string, string> = {
      SAVE_EVERY_N_STEPS: 'Every N Steps',
      SAVE_EVERY_EPOCH: 'Every Epoch',
      SAVE_BEST_MODEL: 'Best Model',
      SAVE_LAST_MODEL: 'Last Model',
      MANUAL_ONLY: 'Manual',
      DISABLED: 'Disabled',
    };

    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700">
        {labels[strategy] || strategy}
      </Badge>
    );
  };

  const getRecoveryStrategyBadge = (strategy: string) => {
    const labels: Record<string, string> = {
      RESUME_LATEST: 'Latest',
      RESUME_BEST: 'Best',
      RESUME_MANUAL: 'Manual',
      ROLLBACK_PREVIOUS: 'Rollback',
      RESTART_TRAINING: 'Restart',
    };

    return (
      <Badge variant="outline" className="bg-green-50 text-green-700">
        {labels[strategy] || strategy}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Checkpoint Manager</h1>
          <p className="text-muted-foreground">
            Configure checkpoint and recovery strategies
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/training/checkpoint/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Configuration
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
            <Save className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Checkpoint configurations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validated</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.validated || 0}</div>
            <p className="text-xs text-muted-foreground">Ready for use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.byStatus?.DRAFT || 0}
            </div>
            <p className="text-xs text-muted-foreground">In configuration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto Recovery</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {configurations.filter((c) => c.recoveryStrategy === 'RESUME_LATEST').length}
            </div>
            <p className="text-xs text-muted-foreground">With auto recovery</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Library</CardTitle>
          <CardDescription>Browse and manage checkpoint configurations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search configurations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={strategyFilter} onValueChange={setStrategyFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Save Strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
                <SelectItem value="SAVE_EVERY_N_STEPS">Every N Steps</SelectItem>
                <SelectItem value="SAVE_EVERY_EPOCH">Every Epoch</SelectItem>
                <SelectItem value="SAVE_BEST_MODEL">Best Model</SelectItem>
                <SelectItem value="SAVE_LAST_MODEL">Last Model</SelectItem>
                <SelectItem value="MANUAL_ONLY">Manual Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="VALIDATED">Validated</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Configurations Table */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : configurations.length === 0 ? (
            <div className="text-center py-12">
              <Save className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No configurations found</h3>
              <p className="text-muted-foreground">
                Create your first checkpoint configuration
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push('/dashboard/training/checkpoint/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Configuration
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Configuration Name</TableHead>
                    <TableHead>Save Strategy</TableHead>
                    <TableHead>Recovery</TableHead>
                    <TableHead>Max Checkpoints</TableHead>
                    <TableHead>Retention</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configurations.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{config.name}</span>
                          {config.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {config.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getSaveStrategyBadge(config.saveStrategy)}</TableCell>
                      <TableCell>{getRecoveryStrategyBadge(config.recoveryStrategy)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{config.maxCheckpoints}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{config.retentionDays} days</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(config.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(config.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/training/checkpoint/${config.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/training/checkpoint/${config.id}/edit`)
                            }
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
