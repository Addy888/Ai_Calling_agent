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
import { Badge } from '@/components/ui/badge';
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
  GitBranch,
  Plus,
  CheckCircle,
  Clock,
  Tag,
  TrendingUp,
  Download,
  Play,
} from 'lucide-react';

export default function VersionManager() {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/training/versions');
      const data = await res.json();
      setVersions(data);
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      DRAFT: 'bg-gray-500',
      VALIDATING: 'bg-blue-500',
      VALIDATED: 'bg-green-500',
      TESTING: 'bg-yellow-500',
      APPROVED: 'bg-purple-500',
      PUBLISHED: 'bg-green-600',
      ARCHIVED: 'bg-gray-400',
    };

    return <Badge className={statusColors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getReadinessColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const currentVersion = versions.find((v) => v.isCurrent);
  const activeVersions = versions.filter((v) => v.isActive);
  const archivedVersions = versions.filter((v) => v.status === 'ARCHIVED');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Version Manager</h1>
          <p className="text-gray-500 mt-1">
            Track and manage AI training versions and releases
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export History
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Version
          </Button>
        </div>
      </div>

      {/* Current Version Card */}
      {currentVersion && (
        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Current Production Version
            </CardTitle>
            <CardDescription>Active version in production environment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Version</div>
                <div className="text-2xl font-bold mt-1">{currentVersion.version}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="text-lg font-semibold mt-1">{currentVersion.versionName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Readiness Score</div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-2xl font-bold ${getReadinessColor(
                      currentVersion.readinessScore || 0,
                    )}`}
                  >
                    {currentVersion.readinessScore?.toFixed(1) || '0.0'}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Published</div>
                <div className="text-lg font-semibold mt-1">
                  {currentVersion.publishedAt
                    ? new Date(currentVersion.publishedAt).toLocaleDateString()
                    : 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{versions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeVersions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {versions.filter((v) => v.status === 'PUBLISHED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">{archivedVersions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Version List */}
      <Card>
        <CardHeader>
          <CardTitle>Training Versions</CardTitle>
          <CardDescription>All training versions and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead>Datasets</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    <GitBranch className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No training versions yet</p>
                    <p className="text-sm mt-2">Create your first version to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                versions.map((version: any) => (
                  <TableRow key={version.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-gray-400" />
                        <span className="font-mono font-semibold">{version.version}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{version.versionName}</div>
                        {version.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {version.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(version.status)}</TableCell>
                    <TableCell>
                      {version.readinessScore !== null && version.readinessScore !== undefined ? (
                        <div className="space-y-1">
                          <span
                            className={`font-semibold ${getReadinessColor(version.readinessScore)}`}
                          >
                            {version.readinessScore.toFixed(1)}%
                          </span>
                          <Progress value={version.readinessScore} className="w-16" />
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {version.datasetVersions &&
                      typeof version.datasetVersions === 'object' &&
                      Object.keys(version.datasetVersions).length > 0 ? (
                        <Badge variant="outline">
                          {Object.keys(version.datasetVersions).length} datasets
                        </Badge>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {version.isCurrent ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Current
                        </Badge>
                      ) : version.isActive ? (
                        <Badge className="bg-blue-500">Active</Badge>
                      ) : (
                        <span className="text-gray-400">Inactive</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {version.publishedAt ? (
                        <div className="text-sm">
                          <div>{new Date(version.publishedAt).toLocaleDateString()}</div>
                          <div className="text-gray-400">
                            {new Date(version.publishedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not published</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{new Date(version.createdAt).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                        {!version.isCurrent && version.status === 'PUBLISHED' && (
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Version Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Version Timeline
          </CardTitle>
          <CardDescription>Historical view of training versions</CardDescription>
        </CardHeader>
        <CardContent>
          {versions.length > 0 ? (
            <div className="space-y-4">
              {versions.slice(0, 5).map((version: any, index: number) => (
                <div key={version.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        version.isCurrent
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {version.isCurrent ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Tag className="h-5 w-5" />
                      )}
                    </div>
                    {index < versions.slice(0, 5).length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-200 my-1"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{version.versionName}</div>
                        <div className="text-sm text-gray-500">Version {version.version}</div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(version.status)}
                        <div className="text-sm text-gray-500 mt-1">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {version.description && (
                      <div className="text-sm text-gray-600 mt-2">{version.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No version history available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
