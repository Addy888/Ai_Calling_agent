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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  FileCheck,
  Activity,
  BarChart3,
  Download,
  Plus,
  RefreshCw,
} from 'lucide-react';

export default function TrainingDashboard() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [trainingJobs, setTrainingJobs] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainingData();
  }, []);

  const fetchTrainingData = async () => {
    setLoading(true);
    try {
      const [datasetsRes, statsRes, readinessRes, jobsRes, versionsRes] = await Promise.all([
        fetch('/api/training/datasets'),
        fetch('/api/training/datasets/stats'),
        fetch('/api/training/readiness'),
        fetch('/api/training/jobs'),
        fetch('/api/training/versions'),
      ]);

      const [datasetsData, statsData, readinessData, jobsData, versionsData] = await Promise.all([
        datasetsRes.json(),
        statsRes.json(),
        readinessRes.json(),
        jobsRes.json(),
        versionsRes.json(),
      ]);

      setDatasets(datasetsData);
      setStats(statsData);
      setReadiness(readinessData);
      setTrainingJobs(jobsData);
      setVersions(versionsData);
    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReadinessColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReadinessStatus = (score: number) => {
    if (score >= 85) return <Badge className="bg-green-500">Ready</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-500">Needs Work</Badge>;
    return <Badge className="bg-red-500">Not Ready</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      DRAFT: 'bg-gray-500',
      VALIDATING: 'bg-blue-500',
      VALIDATED: 'bg-green-500',
      PUBLISHED: 'bg-purple-500',
      ARCHIVED: 'bg-gray-400',
      PENDING: 'bg-yellow-500',
      RUNNING: 'bg-blue-500',
      COMPLETED: 'bg-green-500',
      FAILED: 'bg-red-500',
    };

    return <Badge className={statusColors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

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
          <h1 className="text-3xl font-bold">AI Training Platform</h1>
          <p className="text-gray-500 mt-1">
            Manage datasets, validate data, and prepare AI for production
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTrainingData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Dataset
          </Button>
        </div>
      </div>

      {/* AI Readiness Score */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            AI Readiness Score
          </CardTitle>
          <CardDescription>Overall preparation status for production deployment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-5xl font-bold ${getReadinessColor(readiness?.overallReadiness || 0)}`}>
                {readiness?.overallReadiness?.toFixed(1) || '0.0'}%
              </div>
              <div className="mt-2">{getReadinessStatus(readiness?.overallReadiness || 0)}</div>
              <div className="text-sm text-gray-500 mt-1">Overall Readiness</div>
            </div>

            <div className="col-span-3 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Knowledge Base</span>
                  <span className="font-semibold">{readiness?.knowledgeReadiness?.toFixed(1) || 0}%</span>
                </div>
                <Progress value={readiness?.knowledgeReadiness || 0} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Conversation Training</span>
                  <span className="font-semibold">{readiness?.conversationReadiness?.toFixed(1) || 0}%</span>
                </div>
                <Progress value={readiness?.conversationReadiness || 0} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Prompts & Scripts</span>
                  <span className="font-semibold">{readiness?.promptReadiness?.toFixed(1) || 0}%</span>
                </div>
                <Progress value={readiness?.promptReadiness || 0} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Decision Engine</span>
                  <span className="font-semibold">{readiness?.decisionReadiness?.toFixed(1) || 0}%</span>
                </div>
                <Progress value={readiness?.decisionReadiness || 0} />
              </div>
            </div>
          </div>

          {readiness?.blockers && readiness.blockers.length > 0 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-900">Blockers ({readiness.blockers.length})</span>
              </div>
              <div className="space-y-1">
                {readiness.blockers.map((blocker: any, index: number) => (
                  <div key={index} className="text-sm text-red-800">
                    • {blocker.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {readiness?.warnings && readiness.warnings.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold text-yellow-900">Warnings ({readiness.warnings.length})</span>
              </div>
              <div className="space-y-1">
                {readiness.warnings.map((warning: any, index: number) => (
                  <div key={index} className="text-sm text-yellow-800">
                    • {warning.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Total Datasets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalDatasets || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.totalRecords?.toLocaleString() || 0} records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Valid Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.validRecords?.toLocaleString() || 0}
            </div>
            <Progress 
              value={stats?.totalRecords > 0 ? (stats?.validRecords / stats?.totalRecords) * 100 : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Average Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getReadinessColor(stats?.averageQuality || 0)}`}>
              {stats?.averageQuality?.toFixed(1) || '0.0'}%
            </div>
            <Progress value={stats?.averageQuality || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getReadinessColor(stats?.averageCoverage || 0)}`}>
              {stats?.averageCoverage?.toFixed(1) || '0.0'}%
            </div>
            <Progress value={stats?.averageCoverage || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="datasets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
          <TabsTrigger value="jobs">Training Jobs</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="datasets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Training Datasets</CardTitle>
                  <CardDescription>Manage and organize training data</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Dataset
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Valid</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        No datasets found. Create your first dataset to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    datasets.map((dataset: any) => (
                      <TableRow key={dataset.id}>
                        <TableCell className="font-medium">{dataset.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{dataset.datasetType}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(dataset.status)}</TableCell>
                        <TableCell>{dataset.recordCount?.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">{dataset.validRecordCount}</TableCell>
                        <TableCell>{dataset.version}</TableCell>
                        <TableCell>
                          {new Date(dataset.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Training Jobs</CardTitle>
                  <CardDescription>Monitor dataset validation and training progress</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Training Job
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No training jobs yet. Create a job to validate and prepare datasets.
                      </TableCell>
                    </TableRow>
                  ) : (
                    trainingJobs.map((job: any) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.jobName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.jobType}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={job.progress || 0} className="w-20" />
                            <span className="text-sm">{job.progress?.toFixed(0) || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {job.startedAt ? new Date(job.startedAt).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          {job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Training Versions</CardTitle>
                  <CardDescription>Track AI training versions and releases</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Version
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No training versions yet. Complete training jobs to create versions.
                      </TableCell>
                    </TableRow>
                  ) : (
                    versions.map((version: any) => (
                      <TableRow key={version.id}>
                        <TableCell className="font-medium">{version.version}</TableCell>
                        <TableCell>{version.versionName}</TableCell>
                        <TableCell>{getStatusBadge(version.status)}</TableCell>
                        <TableCell>
                          {version.readinessScore ? (
                            <span className={getReadinessColor(version.readinessScore)}>
                              {version.readinessScore.toFixed(1)}%
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {version.isCurrent && <Badge className="bg-green-500">Current</Badge>}
                          {version.isActive && !version.isCurrent && (
                            <Badge className="bg-blue-500">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(version.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validation Reports</CardTitle>
              <CardDescription>Review data quality and validation results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <FileCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No validation reports available</p>
                <p className="text-sm mt-2">Run dataset validations to see reports here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
