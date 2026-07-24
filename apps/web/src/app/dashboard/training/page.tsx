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
  Database,
  Search,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  BarChart3,
  Settings,
  Filter,
} from 'lucide-react';

interface Dataset {
  id: string;
  name: string;
  datasetType: string;
  version: string;
  recordCount: number;
  validRecordCount: number;
  status: string;
  language: string;
  createdAt: string;
  lastValidatedAt?: string;
}

export default function TrainingCenterPage() {
  const router = useRouter();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchDatasets();
  }, [search, typeFilter, statusFilter]);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter !== 'all') params.append('datasetType', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/ai-agent/training-datasets?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setDatasets(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      DRAFT: { variant: 'secondary', label: 'Draft' },
      VALIDATING: { variant: 'outline', label: 'Validating' },
      VALIDATED: { variant: 'default', label: 'Validated' },
      PUBLISHED: { variant: 'default', label: 'Published' },
      ARCHIVED: { variant: 'secondary', label: 'Archived' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      CONVERSATION: 'bg-blue-100 text-blue-800',
      KNOWLEDGE: 'bg-green-100 text-green-800',
      PROMPT: 'bg-purple-100 text-purple-800',
      SCRIPT: 'bg-orange-100 text-orange-800',
      FAQ: 'bg-pink-100 text-pink-800',
    };

    return (
      <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>
        {type.replace('_', ' ')}
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

  const calculateReadiness = (dataset: Dataset) => {
    const validPercentage =
      dataset.recordCount > 0 ? (dataset.validRecordCount / dataset.recordCount) * 100 : 0;

    if (validPercentage >= 90 && dataset.status === 'VALIDATED') return 'high';
    if (validPercentage >= 70) return 'medium';
    return 'low';
  };

  const getReadinessBadge = (dataset: Dataset) => {
    const readiness = calculateReadiness(dataset);
    const config = {
      high: { icon: CheckCircle, color: 'text-green-600', label: 'Ready' },
      medium: { icon: Clock, color: 'text-yellow-600', label: 'Needs Review' },
      low: { icon: XCircle, color: 'text-red-600', label: 'Not Ready' },
    };

    const { icon: Icon, color, label } = config[readiness];
    return (
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className={`text-sm ${color}`}>{label}</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Training Center</h1>
          <p className="text-muted-foreground">
            Manage datasets and configure training parameters
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/training/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Dataset
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Datasets</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datasets.length}</div>
            <p className="text-xs text-muted-foreground">Active training datasets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validated</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {datasets.filter((d) => d.status === 'VALIDATED').length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for training</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Samples</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {datasets.reduce((sum, d) => sum + d.recordCount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all datasets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valid Samples</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {datasets.reduce((sum, d) => sum + d.validRecordCount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Quality verified</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Dataset Library</CardTitle>
          <CardDescription>Browse and manage your training datasets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search datasets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Dataset Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CONVERSATION">Conversation</SelectItem>
                <SelectItem value="KNOWLEDGE">Knowledge</SelectItem>
                <SelectItem value="PROMPT">Prompt</SelectItem>
                <SelectItem value="SCRIPT">Script</SelectItem>
                <SelectItem value="FAQ">FAQ</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="VALIDATED">Validated</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dataset Table */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : datasets.length === 0 ? (
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No datasets found</h3>
              <p className="text-muted-foreground">
                Create your first training dataset to get started
              </p>
              <Button className="mt-4" onClick={() => router.push('/dashboard/training/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Dataset
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dataset Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Samples</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell className="font-medium">{dataset.name}</TableCell>
                      <TableCell>{getTypeBadge(dataset.datasetType)}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {dataset.version}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{dataset.recordCount.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">
                            {dataset.validRecordCount} valid
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{dataset.language.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(dataset.status)}</TableCell>
                      <TableCell>{getReadinessBadge(dataset)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(dataset.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/training/${dataset.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/training/${dataset.id}/config`)}
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
