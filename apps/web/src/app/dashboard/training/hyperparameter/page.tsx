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
  Settings2,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  MemoryStick,
  Archive,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface HyperparameterConfig {
  id: string;
  name: string;
  description?: string;
  trainingProfile: string;
  epochs: number;
  batchSize: number;
  learningRate: number;
  optimizer: string;
  scheduler: string;
  status: string;
  isValidated: boolean;
  estimatedTrainingTime?: number;
  estimatedGpuMemory?: number;
  createdAt: string;
  updatedAt: string;
}

export default function HyperparameterConfigPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<HyperparameterConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [profileFilter, setProfileFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchConfigurations();
  }, [search, profileFilter, statusFilter]);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (profileFilter !== 'all') params.append('trainingProfile', profileFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/training/hyperparameter-configs?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        const result = await response.json();
        setConfigs(result.configurations || []);
      }
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load hyperparameter configurations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteConfiguration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const response = await fetch(`/api/training/hyperparameter-configs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Configuration deleted successfully' });
        fetchConfigurations();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete configuration',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; variant: any; label: string }> = {
      DRAFT: { icon: Clock, variant: 'secondary', label: 'Draft' },
      READY: { icon: CheckCircle, variant: 'default', label: 'Ready' },
      VALIDATED: { icon: CheckCircle, variant: 'default', label: 'Validated' },
      ARCHIVED: { icon: Archive, variant: 'secondary', label: 'Archived' },
    };

    const config = variants[status] || { icon: Clock, variant: 'secondary', label: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getProfileBadge = (profile: string) => {
    const colors: Record<string, string> = {
      FAST_TRAINING: 'bg-blue-100 text-blue-800',
      BALANCED: 'bg-green-100 text-green-800',
      HIGH_ACCURACY: 'bg-purple-100 text-purple-800',
      LOW_MEMORY: 'bg-yellow-100 text-yellow-800',
      PRODUCTION: 'bg-red-100 text-red-800',
      CUSTOM: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={colors[profile] || 'bg-gray-100 text-gray-800'}>
        {profile.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statsData = {
    total: configs.length,
    validated: configs.filter((c) => c.status === 'VALIDATED').length,
    ready: configs.filter((c) => c.status === 'READY').length,
    draft: configs.filter((c) => c.status === 'DRAFT').length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hyperparameter Configuration</h1>
          <p className="text-muted-foreground">
            Configure training parameters and optimization settings
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/training/hyperparameter/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Configuration
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.total}</div>
            <p className="text-xs text-muted-foreground">All configurations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validated</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.validated}</div>
            <p className="text-xs text-muted-foreground">Ready for training</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.ready}</div>
            <p className="text-xs text-muted-foreground">Configuration complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.draft}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration List */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Library</CardTitle>
          <CardDescription>
            Browse and manage your hyperparameter configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
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

            <Select value={profileFilter} onValueChange={setProfileFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Training Profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Profiles</SelectItem>
                <SelectItem value="FAST_TRAINING">Fast Training</SelectItem>
                <SelectItem value="BALANCED">Balanced</SelectItem>
                <SelectItem value="HIGH_ACCURACY">High Accuracy</SelectItem>
                <SelectItem value="LOW_MEMORY">Low Memory</SelectItem>
                <SelectItem value="PRODUCTION">Production</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
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

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-12">
              <Settings2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No configurations found</h3>
              <p className="text-muted-foreground">
                Create your first hyperparameter configuration to get started
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push('/dashboard/training/hyperparameter/create')}
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
                    <TableHead>Training Profile</TableHead>
                    <TableHead>Epochs</TableHead>
                    <TableHead>Batch Size</TableHead>
                    <TableHead>Learning Rate</TableHead>
                    <TableHead>Optimizer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Est. Time</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{config.name}</div>
                          {config.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {config.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getProfileBadge(config.trainingProfile)}</TableCell>
                      <TableCell>{config.epochs}</TableCell>
                      <TableCell>{config.batchSize}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {config.learningRate}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{config.optimizer}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(config.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatTime(config.estimatedTrainingTime)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(config.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/training/hyperparameter/${config.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/training/hyperparameter/${config.id}/edit`)
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteConfiguration(config.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
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
