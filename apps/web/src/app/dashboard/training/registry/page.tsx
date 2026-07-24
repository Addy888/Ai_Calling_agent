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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  Filter,
  Package,
  CheckCircle,
  XCircle,
  Archive,
  Clock,
  AlertCircle,
  TrendingUp,
  Database,
} from 'lucide-react';

type ModelStatus = 'REGISTERED' | 'READY' | 'TRAINING' | 'EVALUATING' | 'ARCHIVED' | 'FAILED' | 'DEPRECATED';

interface ModelRegistry {
  id: string;
  registryName: string;
  provider: string;
  family: string;
  versionString: string;
  status: ModelStatus;
  isActive: boolean;
  isLatest: boolean;
  description?: string;
  tags?: string[];
  baseModel?: {
    name: string;
    provider: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Statistics {
  total: number;
  active: number;
  registered: number;
  ready: number;
  training: number;
  archived: number;
  providers: { name: string; count: number }[];
  families: { name: string; count: number }[];
}

const statusConfig: Record<ModelStatus, { label: string; color: string; icon: any }> = {
  REGISTERED: { label: 'Registered', color: 'bg-blue-500', icon: Package },
  READY: { label: 'Ready', color: 'bg-green-500', icon: CheckCircle },
  TRAINING: { label: 'Training', color: 'bg-yellow-500', icon: Clock },
  EVALUATING: { label: 'Evaluating', color: 'bg-purple-500', icon: TrendingUp },
  ARCHIVED: { label: 'Archived', color: 'bg-gray-500', icon: Archive },
  FAILED: { label: 'Failed', color: 'bg-red-500', icon: XCircle },
  DEPRECATED: { label: 'Deprecated', color: 'bg-orange-500', icon: AlertCircle },
};

export default function ModelRegistryPage() {
  const router = useRouter();
  const [models, setModels] = useState<ModelRegistry[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    fetchModels();
    fetchStatistics();
  }, [searchQuery, statusFilter, providerFilter, activeFilter]);

  const fetchModels = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (providerFilter !== 'all') params.append('provider', providerFilter);
      if (activeFilter !== 'all') params.append('isActive', activeFilter);

      const response = await fetch(`/api/ai-agent/model-registry?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setModels(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/ai-agent/model-registry/statistics', {
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

  const handleRegisterModel = () => {
    router.push('/dashboard/training/registry/new');
  };

  const handleViewModel = (modelId: string) => {
    router.push(`/dashboard/training/registry/${modelId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-[300px]" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Model Registry</h1>
          <p className="text-muted-foreground">
            Manage your company's AI models and versions
          </p>
        </div>
        <Button onClick={handleRegisterModel}>
          <Plus className="h-4 w-4 mr-2" />
          Register Model
        </Button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Models</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.active} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.ready}</div>
              <p className="text-xs text-muted-foreground">Production ready</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.training}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Archived</CardTitle>
              <Archive className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.archived}</div>
              <p className="text-xs text-muted-foreground">Archived models</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="REGISTERED">Registered</SelectItem>
                  <SelectItem value="READY">Ready</SelectItem>
                  <SelectItem value="TRAINING">Training</SelectItem>
                  <SelectItem value="EVALUATING">Evaluating</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="DEPRECATED">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {statistics?.providers.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name} ({p.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Active Status</label>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Active Only</SelectItem>
                  <SelectItem value="false">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => {
          const config = statusConfig[model.status];
          const StatusIcon = config.icon;

          return (
            <Card
              key={model.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewModel(model.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{model.registryName}</CardTitle>
                    <CardDescription>
                      {model.provider} • {model.family}
                    </CardDescription>
                  </div>
                  {model.isActive && (
                    <Badge variant="default" className="bg-green-500">
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${config.color}`} />
                  <span className="text-sm">{config.label}</span>
                  <Badge variant="outline" className="ml-auto">
                    v{model.versionString}
                  </Badge>
                  {model.isLatest && (
                    <Badge variant="secondary">Latest</Badge>
                  )}
                </div>

                {model.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {model.description}
                  </p>
                )}

                {model.baseModel && (
                  <div className="text-sm text-muted-foreground">
                    Base: {model.baseModel.name}
                  </div>
                )}

                {model.tags && model.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {model.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {model.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{model.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Updated {new Date(model.updatedAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {models.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No models found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by registering your first AI model
            </p>
            <Button onClick={handleRegisterModel}>
              <Plus className="h-4 w-4 mr-2" />
              Register Model
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
