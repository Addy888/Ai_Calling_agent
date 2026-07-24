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
  Settings,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Archive,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FineTuningConfig {
  id: string;
  name: string;
  description?: string;
  trainingMethod: string;
  baseModelId?: string;
  datasetId?: string;
  configurationVersion: string;
  precision: string;
  status: string;
  isValidated: boolean;
  validatedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags?: Record<string, any>;
}

export default function FineTuningConfigPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<FineTuningConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchConfigurations();
  }, [search, methodFilter, statusFilter]);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (methodFilter !== 'all') params.append('trainingMethod', methodFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/training/fine-tuning-configs?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setConfigs(result.configurations || []);
      }
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load fine-tuning configurations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteConfiguration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/training/fine-tuning-configs/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Configuration deleted successfully',
        });
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
      DEPRECATED: { icon: XCircle, variant: 'destructive', label: 'Deprecated' },
    };

    const config = variants[status] || { icon: AlertCircle, variant: 'secondary', label: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      SUPERVISED_FINE_TUNING: 'bg-blue-100 text-blue-800',
      INSTRUCTION_FINE_TUNING: 'bg-purple-100 text-purple-800',
      CONVERSATION_FINE_TUNING: 'bg-green-100 text-green-800',
      DOMAIN_ADAPTATION: 'bg-yellow-100 text-yellow-800',
      LORA: 'bg-orange-100 text-orange-800',
      QLORA: 'bg-red-100 text-red-800',
      ADAPTER_BASED: 'bg-pink-100 text-pink-800',
      FULL_FINE_TUNING: 'bg-indigo-100 text-indigo-800',
    };

    return (
      <Badge className={colors[method] || 'bg-gray-100 text-gray-800'}>
        {method.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
          <h1 className="text-3xl font-bold tracking-tight">Fine-Tuning Configuration</h1>
          <p className="text-muted-foreground">
            Configure and manage AI model fine-tuning parameters
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/training/fine-tuning/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Configuration
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
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
            <CheckCircle className="h-4 w-4 text-blue-600" />
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
            Browse and manage your fine-tuning configurations
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

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Training Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="SUPERVISED_FINE_TUNING">Supervised Fine-Tuning</SelectItem>
                <SelectItem value="INSTRUCTION_FINE_TUNING">Instruction Fine-Tuning</SelectItem>
                <SelectItem value="CONVERSATION_FINE_TUNING">Conversation Fine-Tuning</SelectItem>
                <SelectItem value="DOMAIN_ADAPTATION">Domain Adaptation</SelectItem>
                <SelectItem value="LORA">LoRA</SelectItem>
                <SelectItem value="QLORA">QLoRA</SelectItem>
                <SelectItem value="ADAPTER_BASED">Adapter Based</SelectItem>
                <SelectItem value="FULL_FINE_TUNING">Full Fine-Tuning</SelectItem>
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
              <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No configurations found</h3>
              <p className="text-muted-foreground">
                Create your first fine-tuning configuration to get started
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push('/dashboard/training/fine-tuning/create')}
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
                    <TableHead>Training Method</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Precision</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validated</TableHead>
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
                      <TableCell>{getMethodBadge(config.trainingMethod)}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {config.configurationVersion}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{config.precision}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(config.status)}</TableCell>
                      <TableCell>
                        {config.isValidated ? (
                          <div className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            <span>Yes</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <XCircle className="h-4 w-4" />
                            <span>No</span>
                          </div>
                        )}
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
                              router.push(`/dashboard/training/fine-tuning/${config.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/training/fine-tuning/${config.id}/edit`)
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
