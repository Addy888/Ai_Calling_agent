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
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  FileCheck,
  Shield,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

export default function ValidationDashboard() {
  const [validations, setValidations] = useState<any[]>([]);
  const [qualityChecks, setQualityChecks] = useState<any[]>([]);
  const [coverage, setCoverage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchValidationData();
  }, []);

  const fetchValidationData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/training/validations');
      const data = await res.json();
      setValidations(data);
    } catch (error) {
      console.error('Error fetching validation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      PENDING: 'bg-gray-500',
      RUNNING: 'bg-blue-500',
      COMPLETED: 'bg-green-500',
      FAILED: 'bg-red-500',
    };

    return <Badge className={statusColors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'RUNNING':
        return <Play className="h-5 w-5 text-blue-600" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
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

  const completedValidations = validations.filter((v) => v.status === 'COMPLETED');
  const failedValidations = validations.filter((v) => v.status === 'FAILED');
  const avgScore =
    completedValidations.length > 0
      ? completedValidations.reduce((sum, v) => sum + (v.validationScore || 0), 0) /
        completedValidations.length
      : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Validation Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Monitor data quality, coverage, and validation results
          </p>
        </div>
        <Button>
          <Play className="h-4 w-4 mr-2" />
          Run Validation
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Total Validations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{validations.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {completedValidations.length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {validations.length > 0
                ? ((completedValidations.length / validations.length) * 100).toFixed(0)
                : 0}
              %
            </div>
            <Progress
              value={
                validations.length > 0 ? (completedValidations.length / validations.length) * 100 : 0
              }
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(avgScore)}`}>
              {avgScore.toFixed(1)}
            </div>
            <Progress value={avgScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Quality Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {avgScore >= 85 ? (
              <Badge className="bg-green-500">Excellent</Badge>
            ) : avgScore >= 70 ? (
              <Badge className="bg-yellow-500">Good</Badge>
            ) : (
              <Badge className="bg-red-500">Needs Work</Badge>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {failedValidations.length} failed checks
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Validations</TabsTrigger>
          <TabsTrigger value="quality">Quality Checks</TabsTrigger>
          <TabsTrigger value="coverage">Coverage Analysis</TabsTrigger>
          <TabsTrigger value="issues">Issues & Warnings</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Validation Runs</CardTitle>
              <CardDescription>Latest dataset validation results</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Valid</TableHead>
                    <TableHead>Invalid</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                        <FileCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No validation runs yet</p>
                        <p className="text-sm mt-2">Run dataset validations to see results here</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    validations.map((validation: any) => (
                      <TableRow key={validation.id}>
                        <TableCell>
                          <div className="font-medium">{validation.dataset?.name || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{validation.validationType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(validation.status)}
                            {getStatusBadge(validation.status)}
                          </div>
                        </TableCell>
                        <TableCell>{validation.totalRecords?.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">
                          {validation.validRecords?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {validation.invalidRecords?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {validation.validationScore !== null ? (
                            <div className="space-y-1">
                              <span className={`font-semibold ${getScoreColor(validation.validationScore)}`}>
                                {validation.validationScore.toFixed(1)}
                              </span>
                              <Progress value={validation.validationScore} className="w-16" />
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(validation.startedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {validation.executionTime
                            ? `${(validation.executionTime / 1000).toFixed(1)}s`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Check Results</CardTitle>
                <CardDescription>Dataset quality validation results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Passed Checks</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {completedValidations.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Failed Checks</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">
                      {failedValidations.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Distribution</CardTitle>
                <CardDescription>Validation scores by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['STRUCTURE', 'CONTENT', 'DUPLICATE', 'REFERENCE'].map((type) => {
                    const typeValidations = validations.filter(
                      (v) => v.validationType === type && v.validationScore !== null,
                    );
                    const avgTypeScore =
                      typeValidations.length > 0
                        ? typeValidations.reduce((sum, v) => sum + v.validationScore, 0) /
                          typeValidations.length
                        : 0;

                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{type}</span>
                          <span className="font-semibold">{avgTypeScore.toFixed(1)}%</span>
                        </div>
                        <Progress value={avgTypeScore} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Coverage Analysis</CardTitle>
              <CardDescription>Dataset coverage by type and category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No coverage data available</p>
                <p className="text-sm mt-2">Run coverage analysis to see results</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Issues & Warnings</CardTitle>
              <CardDescription>Validation issues that need attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {validations
                  .filter((v) => v.errors && Array.isArray(v.errors) && v.errors.length > 0)
                  .map((validation: any, index: number) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-red-900">
                            {validation.dataset?.name || 'Unknown Dataset'}
                          </div>
                          <div className="text-sm text-red-800 mt-1">
                            {validation.errors.length} error(s) found
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {validations.filter(
                  (v) => v.errors && Array.isArray(v.errors) && v.errors.length > 0,
                ).length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                    <p>No critical issues found</p>
                    <p className="text-sm mt-2">All validations passed successfully</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
