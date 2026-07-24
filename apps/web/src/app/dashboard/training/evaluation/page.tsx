'use client';

import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Plus,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  Eye,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  BarChart3,
} from 'lucide-react';

export default function TrainingEvaluationPage() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTab, setSelectedTab] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEvaluation, setNewEvaluation] = useState<any>({
    trainingSessionId: '',
    modelRegistryId: '',
    evaluationType: 'FINAL_MODEL',
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchEvaluations();
    fetchStats();
  }, []);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      // Mock data for now
      const mockEvaluations = [
        {
          id: 'eval-1',
          name: 'AI Agent v2.0 - Final Validation',
          trainingSessionId: 'session-1',
          modelRegistryId: 'model-1',
          evaluationType: 'FINAL_MODEL',
          overallScore: 92.5,
          approvalStatus: 'APPROVED',
          createdAt: new Date(Date.now() - 86400000 * 2),
          updatedAt: new Date(Date.now() - 86400000),
        },
        {
          id: 'eval-2',
          name: 'AI Agent v1.9 - Regression Test',
          trainingSessionId: 'session-2',
          modelRegistryId: 'model-2',
          evaluationType: 'REGRESSION',
          overallScore: 87.3,
          approvalStatus: 'PENDING_REVIEW',
          createdAt: new Date(Date.now() - 86400000 * 3),
          updatedAt: new Date(Date.now() - 86400000 * 2),
        },
        {
          id: 'eval-3',
          name: 'AI Agent v1.8 - Benchmark Comparison',
          trainingSessionId: 'session-3',
          modelRegistryId: 'model-3',
          evaluationType: 'BENCHMARK',
          overallScore: 79.8,
          approvalStatus: 'NEEDS_RETRAINING',
          createdAt: new Date(Date.now() - 86400000 * 5),
          updatedAt: new Date(Date.now() - 86400000 * 4),
        },
      ];
      setEvaluations(mockEvaluations);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const mockStats = {
        totalEvaluations: 15,
        approved: 8,
        pendingReview: 4,
        needsRetraining: 2,
        rejected: 1,
        averageScore: 85.7,
        passRate: 73.3,
        topModel: 'AI Agent v2.0',
        topModelScore: 92.5,
      };
      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateEvaluation = async () => {
    try {
      // In production, call the API
      console.log('Creating evaluation:', newEvaluation);
      setShowCreateDialog(false);
      fetchEvaluations();
    } catch (error) {
      console.error('Error creating evaluation:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      APPROVED: 'bg-green-500',
      PENDING_REVIEW: 'bg-yellow-500',
      REJECTED: 'bg-red-500',
      NEEDS_RETRAINING: 'bg-orange-500',
      PRODUCTION_READY: 'bg-blue-500',
      DRAFT: 'bg-gray-500',
    };
    return <Badge className={styles[status] || 'bg-gray-500'}>{status.replace('_', ' ')}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const styles: any = {
      PRE_TRAINING: 'bg-purple-500',
      TRAINING: 'bg-blue-500',
      POST_TRAINING: 'bg-indigo-500',
      FINAL_MODEL: 'bg-green-500',
      REGRESSION: 'bg-orange-500',
      BENCHMARK: 'bg-cyan-500',
      HUMAN: 'bg-pink-500',
    };
    return <Badge variant="outline" className={styles[type] || 'bg-gray-500'}>{type.replace('_', ' ')}</Badge>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredEvaluations = evaluations.filter((evaluation) => {
    const matchesSearch = evaluation.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || evaluation.evaluationType === filterType;
    const matchesStatus = filterStatus === 'all' || evaluation.approvalStatus === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Evaluation Center</h1>
          <p className="text-gray-500 mt-1">
            Validate, evaluate, and approve trained AI models
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Evaluation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Evaluation</DialogTitle>
                <DialogDescription>
                  Set up a new model evaluation configuration
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Evaluation Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., AI Agent v2.1 - Final Validation"
                    value={newEvaluation.name}
                    onChange={(e) =>
                      setNewEvaluation({ ...newEvaluation, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="type">Evaluation Type</Label>
                  <Select
                    value={newEvaluation.evaluationType}
                    onValueChange={(value) =>
                      setNewEvaluation({ ...newEvaluation, evaluationType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRE_TRAINING">Pre-Training Validation</SelectItem>
                      <SelectItem value="TRAINING">Training Validation</SelectItem>
                      <SelectItem value="POST_TRAINING">Post-Training Validation</SelectItem>
                      <SelectItem value="FINAL_MODEL">Final Model Validation</SelectItem>
                      <SelectItem value="REGRESSION">Regression Testing</SelectItem>
                      <SelectItem value="BENCHMARK">Benchmark Comparison</SelectItem>
                      <SelectItem value="HUMAN">Human Evaluation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="trainingSession">Training Session</Label>
                  <Select
                    value={newEvaluation.trainingSessionId}
                    onValueChange={(value) =>
                      setNewEvaluation({ ...newEvaluation, trainingSessionId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select training session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session-1">Session #1 - AI Agent v2.1</SelectItem>
                      <SelectItem value="session-2">Session #2 - AI Agent v2.0</SelectItem>
                      <SelectItem value="session-3">Session #3 - AI Agent v1.9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="model">Model Registry</Label>
                  <Select
                    value={newEvaluation.modelRegistryId}
                    onValueChange={(value) =>
                      setNewEvaluation({ ...newEvaluation, modelRegistryId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="model-1">AI Agent v2.1</SelectItem>
                      <SelectItem value="model-2">AI Agent v2.0</SelectItem>
                      <SelectItem value="model-3">AI Agent v1.9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional description"
                    value={newEvaluation.description}
                    onChange={(e) =>
                      setNewEvaluation({ ...newEvaluation, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateEvaluation}>Create Evaluation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalEvaluations || 0}</div>
            <p className="text-sm text-gray-500 mt-1">
              {stats?.approved || 0} approved, {stats?.pendingReview || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(stats?.averageScore || 0)}`}>
              {stats?.averageScore?.toFixed(1) || '0.0'}
            </div>
            <Progress value={stats?.averageScore || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.passRate?.toFixed(1) || '0.0'}%
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {stats?.approved || 0} of {stats?.totalEvaluations || 0} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{stats?.topModel || 'N/A'}</div>
            <p className="text-sm text-gray-500 mt-1">
              Score: {stats?.topModelScore?.toFixed(1) || '0.0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search evaluations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PRE_TRAINING">Pre-Training</SelectItem>
                <SelectItem value="TRAINING">Training</SelectItem>
                <SelectItem value="POST_TRAINING">Post-Training</SelectItem>
                <SelectItem value="FINAL_MODEL">Final Model</SelectItem>
                <SelectItem value="REGRESSION">Regression</SelectItem>
                <SelectItem value="BENCHMARK">Benchmark</SelectItem>
                <SelectItem value="HUMAN">Human</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="NEEDS_RETRAINING">Needs Retraining</SelectItem>
                <SelectItem value="PRODUCTION_READY">Production Ready</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Evaluations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation History</CardTitle>
          <CardDescription>
            {filteredEvaluations.length} evaluation{filteredEvaluations.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Overall Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvaluations.map((evaluation) => (
                <TableRow key={evaluation.id}>
                  <TableCell className="font-medium">{evaluation.name}</TableCell>
                  <TableCell>{getTypeBadge(evaluation.evaluationType)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${getScoreColor(evaluation.overallScore)}`}>
                        {evaluation.overallScore.toFixed(1)}
                      </span>
                      <Progress value={evaluation.overallScore} className="w-20" />
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(evaluation.approvalStatus)}</TableCell>
                  <TableCell>{new Date(evaluation.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/training/evaluation/${evaluation.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
