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
  Layers,
  Search,
  Plus,
  Eye,
  Settings,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Target,
  GitBranch,
} from 'lucide-react';

interface TrainingStrategy {
  id: string;
  name: string;
  description?: string;
  strategyType: string;
  pipelineType: string;
  status: string;
  isValidated: boolean;
  primaryObjective: string;
  primaryDataset?: {
    id: string;
    name: string;
    recordCount: number;
  };
  fineTuningConfig?: {
    id: string;
    name: string;
  };
  hyperparameterConfig?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Statistics {
  total: number;
  validated: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

export default function TrainingStrategyPage() {
  const router = useRouter();
  const [strategies, setStrategies] = useState<TrainingStrategy[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchStrategies();
    fetchStatistics();
  }, [search, typeFilter, statusFilter]);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('strategyType', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/training/strategies?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        let data = result.data || [];

        // Client-side search filter
        if (search) {
          data = data.filter(
            (s: TrainingStrategy) =>
              s.name.toLowerCase().includes(search.toLowerCase()) ||
              s.description?.toLowerCase().includes(search.toLowerCase()),
          );
        }

        setStrategies(data);
      }
    } catch (error) {
      console.error('Failed to fetch strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/training/strategies/statistics', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
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
      ARCHIVED: { variant: 'secondary', label: 'Archived', icon: XCircle },
      DEPRECATED: { variant: 'outline', label: 'Deprecated', icon: XCircle },
    };

    const config = variants[status] || { variant: 'secondary', label: status, icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      SUPERVISED_FINE_TUNING: 'Supervised',
      INSTRUCTION_TUNING: 'Instruction',
      CONVERSATION_FINE_TUNING: 'Conversation',
      DOMAIN_ADAPTATION: 'Domain Adapt',
      MULTI_TASK_LEARNING: 'Multi-Task',
      CONTINUAL_LEARNING: 'Continual',
      CURRICULUM_LEARNING: 'Curriculum',
      MULTI_STAGE_FINE_TUNING: 'Multi-Stage',
      ADAPTER_BASED_TRAINING: 'Adapter',
      CUSTOM_STRATEGY: 'Custom',
    };

    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700">
        {typeLabels[type] || type}
      </Badge>
    );
  };

  const getPipelineBadge = (type: string) => {
    const colors: Record<string, string> = {
      SINGLE_STAGE: 'bg-green-50 text-green-700',
      MULTI_STAGE: 'bg-purple-50 text-purple-700',
      SEQUENTIAL_TRAINING: 'bg-orange-50 text-orange-700',
      PARALLEL_DATASET_PREPARATION: 'bg-blue-50 text-blue-700',
      HYBRID_STRATEGY: 'bg-pink-50 text-pink-700',
    };

    const labels: Record<string, string> = {
      SINGLE_STAGE: 'Single Stage',
      MULTI_STAGE: 'Multi-Stage',
      SEQUENTIAL_TRAINING: 'Sequential',
      PARALLEL_DATASET_PREPARATION: 'Parallel',
      HYBRID_STRATEGY: 'Hybrid',
    };

    return (
      <Badge className={colors[type] || 'bg-gray-50 text-gray-700'}>
        {labels[type] || type}
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
          <h1 className="text-3xl font-bold tracking-tight">Training Strategy</h1>
          <p className="text-muted-foreground">
            Configure training strategies and define objectives
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/training/strategy/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Strategy
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Strategies</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Training strategies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validated</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.validated || 0}</div>
            <p className="text-xs text-muted-foreground">Ready for execution</p>
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
            <p className="text-xs text-muted-foreground">In development</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.byStatus?.READY || 0}
            </div>
            <p className="text-xs text-muted-foreground">Configured</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Library</CardTitle>
          <CardDescription>Browse and manage your training strategies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search strategies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[220px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Strategy Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SUPERVISED_FINE_TUNING">Supervised Fine-Tuning</SelectItem>
                <SelectItem value="INSTRUCTION_TUNING">Instruction Tuning</SelectItem>
                <SelectItem value="CONVERSATION_FINE_TUNING">Conversation Fine-Tuning</SelectItem>
                <SelectItem value="DOMAIN_ADAPTATION">Domain Adaptation</SelectItem>
                <SelectItem value="MULTI_TASK_LEARNING">Multi-Task Learning</SelectItem>
                <SelectItem value="CONTINUAL_LEARNING">Continual Learning</SelectItem>
                <SelectItem value="CURRICULUM_LEARNING">Curriculum Learning</SelectItem>
                <SelectItem value="MULTI_STAGE_FINE_TUNING">Multi-Stage</SelectItem>
                <SelectItem value="ADAPTER_BASED_TRAINING">Adapter-Based</SelectItem>
                <SelectItem value="CUSTOM_STRATEGY">Custom</SelectItem>
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

          {/* Strategy Table */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : strategies.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No strategies found</h3>
              <p className="text-muted-foreground">
                Create your first training strategy to get started
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push('/dashboard/training/strategy/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Strategy
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Strategy Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Primary Objective</TableHead>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Config</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {strategies.map((strategy) => (
                    <TableRow key={strategy.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{strategy.name}</span>
                          {strategy.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {strategy.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(strategy.strategyType)}</TableCell>
                      <TableCell>{getPipelineBadge(strategy.pipelineType)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Target className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{strategy.primaryObjective}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {strategy.primaryDataset ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {strategy.primaryDataset.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {strategy.primaryDataset.recordCount.toLocaleString()} samples
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {strategy.fineTuningConfig && (
                            <Badge variant="outline" className="text-xs">
                              FT: {strategy.fineTuningConfig.name}
                            </Badge>
                          )}
                          {strategy.hyperparameterConfig && (
                            <Badge variant="outline" className="text-xs">
                              HP: {strategy.hyperparameterConfig.name}
                            </Badge>
                          )}
                          {!strategy.fineTuningConfig && !strategy.hyperparameterConfig && (
                            <span className="text-xs text-muted-foreground">Not configured</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(strategy.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(strategy.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/training/strategy/${strategy.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/training/strategy/${strategy.id}/edit`)
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
