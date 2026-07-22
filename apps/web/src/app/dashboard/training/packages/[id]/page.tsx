'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Package, Download, Settings, CheckCircle, XCircle,
  AlertCircle, FileArchive, Shield, Database, Clock, Code,
  Layers, Server, FileText, Lock, Info, Activity, History,
  Play, Archive, Trash2, Copy, Eye
} from 'lucide-react';

export default function PackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchPackageDetails();
  }, [params.id]);

  const fetchPackageDetails = async () => {
    setLoading(true);
    try {
      // Mock package data
      const mockPackage = {
        id: params.id,
        packageName: 'ai-calling-agent-v2.0',
        packageVersion: '2.0.0',
        packageDescription: 'AI Calling Agent v2.0 - Production Ready',
        modelRegistryId: 'model-1',
        trainingSessionId: 'session-1',
        exportFormat: 'SAFETENSORS',
        deploymentTarget: 'DOCKER',
        compression: 'GZIP',
        encryption: 'AES_256',
        status: 'READY',
        estimatedSize: '1.2 GB',
        createdBy: 'admin@example.com',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          modelName: 'ai-calling-agent-v2.0',
          modelVersion: '2.0.0',
          baseModel: 'llama-2-7b-chat',
          trainingVersion: '1.0.0',
          datasetVersion: '1.0.0',
          fineTuningMethod: 'LoRA',
          hyperparameterVersion: '1.0.0',
          checkpointVersion: 'checkpoint-final',
          evaluationVersion: '1.0.0',
          trainingDate: new Date(Date.now() - 86400000 * 5).toISOString(),
          evaluationScore: 92.5,
          license: 'Apache-2.0',
          author: 'AI Calling Agent Team',
        },
        configuration: {
          model_type: 'llama',
          hidden_size: 4096,
          num_attention_heads: 32,
          num_hidden_layers: 32,
          vocab_size: 32000,
          max_position_embeddings: 2048,
        },
        manifest: {
          packageName: 'ai-calling-agent-v2.0',
          packageVersion: '2.0.0',
          exportFormat: 'SAFETENSORS',
          deploymentTarget: 'DOCKER',
          createdAt: new Date().toISOString(),
          files: [
            { name: 'model.safetensors', path: '/model/model.safetensors', size: 14000000000, checksum: 'sha256:abc123', type: 'model' },
            { name: 'config.json', path: '/model/config.json', size: 1024, checksum: 'sha256:def456', type: 'configuration' },
            { name: 'tokenizer.json', path: '/model/tokenizer.json', size: 2048, checksum: 'sha256:ghi789', type: 'tokenizer' },
            { name: 'metadata.json', path: '/model/metadata.json', size: 512, checksum: 'sha256:jkl012', type: 'metadata' },
            { name: 'README.md', path: '/README.md', size: 4096, checksum: 'sha256:mno345', type: 'documentation' },
          ],
          dependencies: { transformers: '>=4.30.0', torch: '>=2.0.0', safetensors: '>=0.3.0' },
          requirements: ['Python >= 3.8', 'CUDA >= 11.8 (optional)', 'RAM >= 16GB', 'Disk Space >= 20GB'],
        },
        validation: {
          isValid: true,
          checks: {
            trainingCompleted: true,
            evaluationApproved: true,
            checkpointExists: true,
            configurationExists: true,
            modelRegistryExists: true,
          },
          errors: [],
          warnings: ['Ensure model has been tested in staging environment'],
        },
        versionHistory: [
          { version: '2.0.0', date: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'READY', notes: 'Initial release' },
          { version: '1.9.0', date: new Date(Date.now() - 86400000 * 10).toISOString(), status: 'ARCHIVED', notes: 'Previous version' },
        ],
      };
      setPackageData(mockPackage);
    } catch (error) {
      console.error('Error fetching package:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareExport = async () => {
    console.log('Preparing export for package:', params.id);
    // Export preparation logic
  };

  const handleDownload = () => {
    console.log('Downloading package:', params.id);
  };

  const handleArchive = () => {
    console.log('Archiving package:', params.id);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this package?')) {
      console.log('Deleting package:', params.id);
      router.push('/dashboard/training/packages');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold">Package not found</h3>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      READY: 'bg-green-500',
      EXPORTED: 'bg-blue-500',
      PREPARING: 'bg-yellow-500',
      DRAFT: 'bg-gray-500',
      FAILED: 'bg-red-500',
      CANCELLED: 'bg-gray-400',
      ARCHIVED: 'bg-gray-600',
    };
    const icons: Record<string, any> = {
      READY: CheckCircle,
      EXPORTED: Download,
      PREPARING: Clock,
      DRAFT: FileArchive,
      FAILED: XCircle,
      CANCELLED: XCircle,
      ARCHIVED: Archive,
    };
    const Icon = icons[status] || Package;
    return (
      <Badge className={styles[status] || 'bg-gray-500'}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              {packageData.packageName}
            </h1>
            <p className="text-gray-500 mt-1">
              Version {packageData.packageVersion} • Package ID: {packageData.id}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          {packageData.status === 'READY' && (
            <Button onClick={handlePrepareExport} className="bg-blue-600 hover:bg-blue-700">
              <Play className="h-4 w-4 mr-2" />
              Prepare Export
            </Button>
          )}
          <Button variant="outline" onClick={handleArchive}>
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
          <Button variant="outline" className="text-red-600" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {getStatusBadge(packageData.status)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Export Format</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="bg-purple-100 text-purple-800">
              {packageData.exportFormat}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Deployment Target</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              {packageData.deploymentTarget.replace(/_/g, ' ')}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Package Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packageData.estimatedSize}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Evaluation Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {packageData.metadata.evaluationScore}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Status */}
      {packageData.validation && (
        <Card className={packageData.validation.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {packageData.validation.isValid ? (
                <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 mt-1" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  {packageData.validation.isValid ? 'Validation Passed' : 'Validation Failed'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  {Object.entries(packageData.validation.checks).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-center gap-2">
                      {value ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </div>
                  ))}
                </div>
                {packageData.validation.warnings.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      Warnings
                    </h4>
                    <ul className="mt-1 space-y-1">
                      {packageData.validation.warnings.map((warning: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600">• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <Info className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="manifest">
            <FileText className="h-4 w-4 mr-2" />
            Manifest
          </TabsTrigger>
          <TabsTrigger value="metadata">
            <Database className="h-4 w-4 mr-2" />
            Metadata
          </TabsTrigger>
          <TabsTrigger value="configuration">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Package Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Package Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Package Name</div>
                  <div className="font-medium">{packageData.packageName}</div>
                  
                  <div className="text-gray-500">Version</div>
                  <div className="font-medium">{packageData.packageVersion}</div>
                  
                  <div className="text-gray-500">Description</div>
                  <div className="font-medium col-span-1">{packageData.packageDescription}</div>
                  
                  <div className="text-gray-500">Created By</div>
                  <div className="font-medium">{packageData.createdBy}</div>
                  
                  <div className="text-gray-500">Created At</div>
                  <div className="font-medium">{new Date(packageData.createdAt).toLocaleString()}</div>
                  
                  <div className="text-gray-500">Last Updated</div>
                  <div className="font-medium">{new Date(packageData.updatedAt).toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>

            {/* Security Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Integrity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Compression</div>
                  <div className="font-medium flex items-center gap-2">
                    <FileArchive className="h-4 w-4" />
                    {packageData.compression}
                  </div>
                  
                  <div className="text-gray-500">Encryption</div>
                  <div className="font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {packageData.encryption}
                  </div>
                  
                  <div className="text-gray-500">Checksum</div>
                  <div className="font-mono text-xs break-all">
                    {packageData.manifest.files[0]?.checksum || 'N/A'}
                  </div>
                  
                  <div className="text-gray-500">License</div>
                  <div className="font-medium">{packageData.metadata.license}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deployment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Deployment Configuration
              </CardTitle>
              <CardDescription>Target environment and requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Deployment Target</h4>
                  <Badge variant="outline" className="text-base px-4 py-2">
                    {packageData.deploymentTarget.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">System Requirements</h4>
                  <ul className="space-y-2">
                    {packageData.manifest.requirements.map((req: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manifest Tab */}
        <TabsContent value="manifest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Package Manifest
              </CardTitle>
              <CardDescription>Complete list of files included in the package</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 pb-2 border-b font-semibold text-sm">
                  <div>File Name</div>
                  <div>Type</div>
                  <div>Size</div>
                  <div>Checksum</div>
                </div>
                {packageData.manifest.files.map((file: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-4 gap-4 text-sm py-2 border-b hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{file.name}</span>
                    </div>
                    <div>
                      <Badge variant="outline">{file.type}</Badge>
                    </div>
                    <div className="text-gray-600">{formatBytes(file.size)}</div>
                    <div className="font-mono text-xs text-gray-500 truncate">{file.checksum}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gray-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Dependencies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {Object.entries(packageData.manifest.dependencies).map(([name, version]: [string, any]) => (
                        <li key={name} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{name}</span>
                          <code className="text-xs bg-white px-2 py-1 rounded">{version}</code>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-gray-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Package Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Files</span>
                      <span className="font-semibold">{packageData.manifest.files.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Size</span>
                      <span className="font-semibold">{packageData.estimatedSize}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Dependencies</span>
                      <span className="font-semibold">{Object.keys(packageData.manifest.dependencies).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Format</span>
                      <span className="font-semibold">{packageData.exportFormat}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Model Metadata
              </CardTitle>
              <CardDescription>Comprehensive model information and training details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500 mb-2">Model Information</h4>
                    <div className="space-y-2">
                      {[
                        ['Model Name', packageData.metadata.modelName],
                        ['Model Version', packageData.metadata.modelVersion],
                        ['Base Model', packageData.metadata.baseModel],
                        ['Fine-Tuning Method', packageData.metadata.fineTuningMethod],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm text-gray-500 mb-2">Training Information</h4>
                    <div className="space-y-2">
                      {[
                        ['Training Version', packageData.metadata.trainingVersion],
                        ['Dataset Version', packageData.metadata.datasetVersion],
                        ['Hyperparameter Version', packageData.metadata.hyperparameterVersion],
                        ['Checkpoint Version', packageData.metadata.checkpointVersion],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500 mb-2">Evaluation & Quality</h4>
                    <div className="space-y-2">
                      {[
                        ['Evaluation Version', packageData.metadata.evaluationVersion],
                        ['Evaluation Score', `${packageData.metadata.evaluationScore} / 100`],
                        ['Training Date', new Date(packageData.metadata.trainingDate).toLocaleDateString()],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm text-gray-500 mb-2">Licensing & Attribution</h4>
                    <div className="space-y-2">
                      {[
                        ['License', packageData.metadata.license],
                        ['Author', packageData.metadata.author],
                        ['Package Version', packageData.metadata.packageVersion],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Model Configuration
              </CardTitle>
              <CardDescription>Technical model architecture and parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                <pre className="text-green-400 text-sm font-mono">
                  {JSON.stringify(packageData.configuration, null, 2)}
                </pre>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(packageData.configuration).map(([key, value]: [string, any]) => (
                  <Card key={key} className="bg-gray-50">
                    <CardContent className="pt-4">
                      <div className="text-xs text-gray-500 mb-1">{key}</div>
                      <div className="text-lg font-semibold">{value.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6">
                <Button variant="outline" className="w-full">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Configuration JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Version History
              </CardTitle>
              <CardDescription>Track all versions and changes to this package</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {packageData.versionHistory.map((version: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-shrink-0">
                      {getStatusBadge(version.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold">Version {version.version}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(version.date).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {version.status === 'ARCHIVED' && (
                            <Button variant="outline" size="sm">
                              <Activity className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{version.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Export Activity Log
              </CardTitle>
              <CardDescription>Recent export and deployment activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { action: 'Package Created', user: 'admin@example.com', time: new Date(Date.now() - 86400000 * 2) },
                  { action: 'Validation Passed', user: 'System', time: new Date(Date.now() - 86400000 * 2) },
                  { action: 'Status Changed to READY', user: 'System', time: new Date(Date.now() - 86400000 * 1) },
                ].map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">{log.action}</div>
                        <div className="text-xs text-gray-500">by {log.user}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {log.time.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
