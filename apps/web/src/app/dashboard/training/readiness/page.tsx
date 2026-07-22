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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Rocket,
  Shield,
  Target,
  Zap,
  Download,
  Database,
  Cpu,
  HardDrive,
  Clock,
  Lock,
} from 'lucide-react';

interface ReadinessReport {
  id: string;
  overallScore: number;
  status: string;
  datasetScore: number;
  modelScore: number;
  configurationScore: number;
  compatibilityScore: number;
  securityScore: number;
  datasetCheck: any;
  modelCheck: any;
  configurationCheck: any;
  compatibilityCheck: any;
  systemRequirements: any;
  securityCheck: any;
  blockers: any[];
  warnings: any[];
  recommendations: any[];
  checkCompletedAt: string;
  executionTimeMs: number;
}

export default function ReadinessDashboard() {
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchReadinessData();
  }, []);

  const fetchReadinessData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/training/readiness/latest');
      if (res.ok) {
        const data = await res.json();
        setReadiness(data);
      }
    } catch (error) {
      console.error('Error fetching readiness data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runReadinessCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/training/readiness/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId: 'dataset-id',
          modelRegistryId: 'model-id',
          forceNew: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReadiness(data);
      }
    } catch (error) {
      console.error('Error running readiness check:', error);
    } finally {
      setChecking(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 90) return 'from-green-50 to-emerald-50';
    if (score >= 75) return 'from-blue-50 to-cyan-50';
    if (score >= 60) return 'from-yellow-50 to-amber-50';
    return 'from-red-50 to-rose-50';
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      READY: { label: 'Ready', color: 'bg-green-500', icon: CheckCircle },
      ALMOST_READY: { label: 'Almost Ready', color: 'bg-blue-500', icon: Activity },
      CONFIGURATION_REQUIRED: { label: 'Config Required', color: 'bg-yellow-500', icon: AlertTriangle },
      VALIDATION_FAILED: { label: 'Validation Failed', color: 'bg-orange-500', icon: AlertTriangle },
      BLOCKED: { label: 'Blocked', color: 'bg-red-500', icon: AlertTriangle },
      NOT_READY: { label: 'Not Ready', color: 'bg-gray-500', icon: AlertTriangle },
    };
    return configs[status] || configs.NOT_READY;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!readiness) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Readiness Report</CardTitle>
            <CardDescription>Run a readiness check to evaluate training preparation</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runReadinessCheck} disabled={checking}>
              {checking ? 'Running Check...' : 'Run Readiness Check'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = getStatusConfig(readiness.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Readiness Dashboard</h1>
          <p className="text-gray-500 mt-1">Comprehensive validation before training job creation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReadinessData}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={runReadinessCheck} disabled={checking}>
            <Zap className="h-4 w-4 mr-2" />
            {checking ? 'Checking...' : 'Run Check'}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overall Score Card */}
      <Card className={`border-2 bg-gradient-to-r ${getScoreGradient(readiness.overallScore)}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6" />
            Overall Training Readiness Score
          </CardTitle>
          <CardDescription>
            Checked {new Date(readiness.checkCompletedAt).toLocaleString()} • {readiness.executionTimeMs}ms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(readiness.overallScore)}`}>
                {readiness.overallScore}
              </div>
              <div className="text-sm text-gray-600 mt-1">/ 100</div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <StatusIcon className={`h-6 w-6 ${getScoreColor(readiness.overallScore)}`} />
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              </div>
            </div>
            <div className="col-span-2 space-y-3">
              <ScoreBar icon={Database} label="Dataset" score={readiness.datasetScore} />
              <ScoreBar icon={Cpu} label="Model" score={readiness.modelScore} />
              <ScoreBar icon={Activity} label="Configuration" score={readiness.configurationScore} />
              <ScoreBar icon={Target} label="Compatibility" score={readiness.compatibilityScore} />
              <ScoreBar icon={Lock} label="Security" score={readiness.securityScore} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="blockers">
            Blockers {readiness.blockers?.length > 0 && `(${readiness.blockers.length})`}
          </TabsTrigger>
          <TabsTrigger value="warnings">
            Warnings {readiness.warnings?.length > 0 && `(${readiness.warnings.length})`}
          </TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CheckCard
              title="Dataset Status"
              icon={Database}
              items={[
                { label: 'Exists', value: readiness.datasetCheck.exists },
                { label: 'Validated', value: readiness.datasetCheck.validated },
                { label: 'Records', value: readiness.datasetCheck.recordCount || 0 },
                { label: 'Quality', value: `${readiness.datasetCheck.validationScore?.toFixed(1) || 0}%` },
              ]}
            />
            <CheckCard
              title="Model Status"
              icon={Cpu}
              items={[
                { label: 'Selected', value: readiness.modelCheck.selected },
                { label: 'Active', value: readiness.modelCheck.active },
                { label: 'Status', value: readiness.modelCheck.status || 'N/A' },
                { label: 'License', value: readiness.modelCheck.license || 'N/A' },
              ]}
            />
            <CheckCard
              title="Compatibility"
              icon={Target}
              items={[
                { label: 'Report', value: readiness.compatibilityCheck.reportExists },
                { label: 'Passed', value: readiness.compatibilityCheck.passed },
                { label: 'Language', value: readiness.compatibilityCheck.languageCompatible },
                { label: 'Hardware', value: readiness.compatibilityCheck.hardwareCompatible },
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="blockers">
          <IssueList
            title="Critical Blockers"
            description="Issues that must be resolved before training"
            icon={AlertTriangle}
            items={readiness.blockers}
            color="red"
          />
        </TabsContent>

        <TabsContent value="warnings">
          <IssueList
            title="Warnings"
            description="Issues that should be addressed but are not blocking"
            icon={AlertTriangle}
            items={readiness.warnings}
            color="yellow"
          />
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {readiness.recommendations?.length > 0 ? (
                <div className="space-y-3">
                  {readiness.recommendations.map((rec: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-blue-900">{rec.type}</div>
                        <div className="text-sm text-blue-800 mt-1">{rec.message}</div>
                        {rec.action && <div className="text-sm text-blue-700 mt-2 italic">→ {rec.action}</div>}
                        <Badge className="mt-2 bg-blue-600">{rec.priority}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle} message="No Recommendations" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SystemCard
              icon={Cpu}
              title="GPU Memory"
              value={`${readiness.systemRequirements?.estimatedRecGpuMemoryGB?.toFixed(1) || 'N/A'} GB`}
              subtitle={`Min: ${readiness.systemRequirements?.estimatedMinGpuMemoryGB?.toFixed(1) || 'N/A'} GB`}
              progress={((readiness.systemRequirements?.estimatedRecGpuMemoryGB || 0) / 80) * 100}
            />
            <SystemCard
              icon={Activity}
              title="RAM"
              value={`${readiness.systemRequirements?.estimatedRamGB?.toFixed(1) || 'N/A'} GB`}
              subtitle="System memory"
              progress={((readiness.systemRequirements?.estimatedRamGB || 0) / 128) * 100}
            />
            <SystemCard
              icon={HardDrive}
              title="Disk Space"
              value={`${readiness.systemRequirements?.estimatedDiskGB?.toFixed(1) || 'N/A'} GB`}
              subtitle="Storage required"
              progress={((readiness.systemRequirements?.estimatedDiskGB || 0) / 500) * 100}
            />
            <SystemCard
              icon={Clock}
              title="Training Time"
              value={`${readiness.systemRequirements?.estimatedTrainingTimeHours?.toFixed(1) || 'N/A'} hrs`}
              subtitle="Estimated duration"
            />
            <SystemCard
              icon={Database}
              title="Checkpoint"
              value={`${readiness.systemRequirements?.estimatedCheckpointSizeGB?.toFixed(1) || 'N/A'} GB`}
              subtitle="Per checkpoint"
            />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <SecurityItem label="JWT Auth" enabled={readiness.securityCheck?.jwtAuthEnabled} />
                <SecurityItem label="RBAC" enabled={readiness.securityCheck?.rbacEnabled} />
                <SecurityItem label="Ownership" enabled={readiness.securityCheck?.datasetOwnershipVerified} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {readiness.status === 'READY' && (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-green-500 text-white rounded-full p-3">
                  <Rocket className="h-8 w-8" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-900">Ready for Training</div>
                  <div className="text-green-700 mt-1">All requirements met • Training job can be created</div>
                </div>
              </div>
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                <Rocket className="h-5 w-5 mr-2" />
                Create Training Job
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Components
function ScoreBar({ icon: Icon, label, score }: { icon: any; label: string; score: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
        <span className="font-semibold">{score}%</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}

function CheckCard({ title, icon: Icon, items }: any) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>{item.label}</span>
              {typeof item.value === 'boolean' ? (
                <Badge variant={item.value ? 'default' : 'destructive'}>
                  {item.value ? 'Yes' : 'No'}
                </Badge>
              ) : (
                <span className="font-semibold">{item.value}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function IssueList({ title, description, icon: Icon, items, color }: any) {
  const colorMap: any = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-600' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600', badge: 'bg-yellow-600' },
  };
  const colors = colorMap[color];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${colors.text}`} />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items?.length > 0 ? (
          <div className="space-y-3">
            {items.map((item: any, idx: number) => (
              <div key={idx} className={`flex items-start gap-3 p-4 ${colors.bg} border-2 ${colors.border} rounded-lg`}>
                <Icon className={`h-5 w-5 ${colors.text} mt-0.5 flex-shrink-0`} />
                <div className="flex-1">
                  <div className={`font-semibold ${colors.text.replace('600', '900')}`}>{item.type}</div>
                  <div className={`text-sm ${colors.text.replace('600', '800')} mt-1`}>{item.message}</div>
                  {item.suggestion && (
                    <div className={`text-sm ${colors.text.replace('600', '700')} mt-2 italic`}>
                      → {item.suggestion}
                    </div>
                  )}
                  <Badge className={`mt-2 ${colors.badge}`}>{item.severity}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={CheckCircle} message={`No ${title}`} />
        )}
      </CardContent>
    </Card>
  );
}

function SystemCard({ icon: Icon, title, value, subtitle, progress }: any) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
        {progress !== undefined && <Progress value={progress} className="mt-2" />}
      </CardContent>
    </Card>
  );
}

function SecurityItem({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <CheckCircle className={`h-4 w-4 ${enabled ? 'text-green-600' : 'text-red-600'}`} />
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-8">
      <Icon className="h-12 w-12 mx-auto mb-4 text-green-400" />
      <p className="text-green-600 font-semibold">{message}</p>
      <p className="text-sm text-gray-500 mt-2">All checks passed</p>
    </div>
  );
}
