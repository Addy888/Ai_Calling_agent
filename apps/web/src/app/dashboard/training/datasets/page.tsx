'use client';

import React, { useState, useEffect } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Database,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  BarChart3,
} from 'lucide-react';

export default function DatasetManager() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchDatasets();
  }, [typeFilter, statusFilter]);

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('datasetType', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/training/datasets?${params.toString()}`);
      const data = await res.json();
      setDatasets(data);
    } catch (error) {
      console.error('Error fetching datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      DRAFT: 'bg-gray-500',
      VALIDATING: 'bg-blue-500',
      VALIDATED: 'bg-green-500',
      PUBLISHED: 'bg-purple-500',
      ARCHIVED: 'bg-gray-400',
    };

    return <Badge className={statusColors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getQualityColor = (valid: number, total: number) => {
    if (total === 0) return 'text-gray-500';
    const percentage = (valid / total) * 100;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredDatasets = datasets.filter((dataset) =>
    dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dataset.datasetType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dataset Manager</h1>
          <p className="text-gray-500 mt-1">
            Create, manage, and validate training datasets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Dataset
          </Button>
        </div>
      </div>

      {/* Dataset Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Datasets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{datasets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {datasets.filter((d) => d.status === 'PUBLISHED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {datasets.reduce((sum, d) => sum + d.recordCount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Valid Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {datasets.reduce((sum, d) => sum + d.validRecordCount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dataset Types Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Dataset Types</CardTitle>
          <CardDescription>Distribution of datasets by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['CONVERSATION', 'KNOWLEDGE', 'PROMPT', 'SCRIPT', 'FAQ'].map((type) => {
              const count = datasets.filter((d) => d.datasetType === type).length;
              return (
                <div key={type} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-gray-500 mt-1">{type}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search datasets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CONVERSATION">Conversation</SelectItem>
                <SelectItem value="KNOWLEDGE">Knowledge</SelectItem>
                <SelectItem value="PROMPT">Prompt</SelectItem>
                <SelectItem value="SCRIPT">Script</SelectItem>
                <SelectItem value="FAQ">FAQ</SelectItem>
                <SelectItem value="BUSINESS_RULE">Business Rule</SelectItem>
                <SelectItem value="EVALUATION">Evaluation</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="VALIDATING">Validating</SelectItem>
                <SelectItem value="VALIDATED">Validated</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Datasets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Datasets</CardTitle>
          <CardDescription>
            Showing {filteredDatasets.length} of {datasets.length} datasets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDatasets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No datasets found</p>
                    <p className="text-sm mt-2">
                      {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first dataset to get started'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDatasets.map((dataset: any) => {
                  const qualityPercentage =
                    dataset.recordCount > 0
                      ? (dataset.validRecordCount / dataset.recordCount) * 100
                      : 0;

                  return (
                    <TableRow key={dataset.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{dataset.name}</div>
                          {dataset.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {dataset.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{dataset.datasetType}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(dataset.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{dataset.recordCount.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">
                            {dataset.validRecordCount} valid
                            {dataset.invalidRecordCount > 0 &&
                              `, ${dataset.invalidRecordCount} invalid`}
                            {dataset.duplicateCount > 0 && `, ${dataset.duplicateCount} duplicates`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className={`font-semibold ${getQualityColor(dataset.validRecordCount, dataset.recordCount)}`}>
                            {qualityPercentage.toFixed(0)}%
                          </div>
                          <Progress value={qualityPercentage} className="w-16" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {dataset._count?.coverage > 0 ? (
                          <Badge variant="outline" className="bg-green-50">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Analyzed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{dataset.version}</div>
                          <div className="text-xs text-gray-500">
                            {dataset._count?.versions || 0} versions
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(dataset.updatedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
