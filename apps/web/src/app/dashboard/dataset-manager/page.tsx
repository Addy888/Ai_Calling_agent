'use client';

import { useState, useEffect } from 'react';
import { Upload, Search, Filter, Download, Trash2, Play, FileAudio, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface DatasetRecord {
  id: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  status: string;
  processingStage: string;
  processingProgress: number;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalFiles: number;
  processed: number;
  pending: number;
  failed: number;
  languages: Array<{ language: string; count: number }>;
  totalDuration: number;
  storageUsed: number;
  averageNoiseLevel: number;
  processingStats: {
    validation: number;
    transcription: number;
    diarization: number;
    conversation: number;
    entityExtraction: number;
    intentDetection: number;
  };
}

export default function DatasetManagerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDashboard();
    fetchDatasets();
  }, [page, statusFilter]);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/v1/dataset/dashboard', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  };

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const response = await fetch(`/api/v1/dataset?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setDatasets(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = () => {
    router.push('/dashboard/dataset-manager/upload');
  };

  const handleViewDetails = (id: string) => {
    router.push(`/dashboard/dataset-manager/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;

    try {
      const response = await fetch(`/api/v1/dataset/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Dataset deleted successfully' });
        fetchDatasets();
        fetchDashboard();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete dataset',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: 'secondary',
      UPLOADING: 'default',
      UPLOADED: 'default',
      VALIDATING: 'default',
      VALIDATED: 'default',
      PROCESSING: 'default',
      PROCESSED: 'default',
      COMPLETED: 'default',
      FAILED: 'destructive',
      CANCELLED: 'secondary',
    };

    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dataset Manager</h1>
          <p className="text-gray-600">Enterprise AI Dataset Processing Pipeline</p>
        </div>
        <Button onClick={handleUpload}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
      </div>

      {/* Dashboard Stats */}
      {dashboard && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <FileAudio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.totalFiles}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard.processed} processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <Play className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.pending}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard.failed} failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
              <FileAudio className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(dashboard.totalDuration)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboard.languages.length} languages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <Download className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatFileSize(dashboard.storageUsed)}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg noise: {(dashboard.averageNoiseLevel * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Processing Statistics */}
      {dashboard && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Pipeline Statistics</CardTitle>
            <CardDescription>Completed processing stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-gray-600">Validation</p>
                <p className="text-2xl font-bold">{dashboard.processingStats.validation}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Transcription</p>
                <p className="text-2xl font-bold">{dashboard.processingStats.transcription}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Diarization</p>
                <p className="text-2xl font-bold">{dashboard.processingStats.diarization}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Conversation</p>
                <p className="text-2xl font-bold">{dashboard.processingStats.conversation}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Entity Extraction</p>
                <p className="text-2xl font-bold">{dashboard.processingStats.entityExtraction}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Intent Detection</p>
                <p className="text-2xl font-bold">{dashboard.processingStats.intentDetection}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search files..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchDatasets()}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchDatasets} variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dataset Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dataset Records</CardTitle>
          <CardDescription>
            {datasets.length} files • Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading datasets...</p>
            </div>
          ) : datasets.length === 0 ? (
            <div className="text-center py-12">
              <FileAudio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No datasets found</p>
              <Button onClick={handleUpload} className="mt-4">
                Upload Your First File
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell className="font-medium">
                        {dataset.originalFileName}
                      </TableCell>
                      <TableCell>{getStatusBadge(dataset.status)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {dataset.processingStage || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {dataset.processingProgress > 0 && (
                          <div className="space-y-1">
                            <Progress value={dataset.processingProgress} />
                            <p className="text-xs text-gray-600">
                              {dataset.processingProgress}%
                            </p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatFileSize(Number(dataset.fileSize))}</TableCell>
                      <TableCell>
                        {new Date(dataset.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(dataset.id)}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(dataset.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
