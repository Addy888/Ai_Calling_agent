'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Package,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Archive,
  FileArchive,
  Layers,
  Settings,
  Activity,
} from 'lucide-react';

export default function ModelPackagingPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPackage, setNewPackage] = useState<any>({
    packageName: '',
    packageVersion: '1.0.0',
    packageDescription: '',
    modelRegistryId: '',
    trainingSessionId: '',
    exportFormat: 'SAFETENSORS',
    deploymentTarget: 'DOCKER',
    compression: 'GZIP',
    encryption: 'AES_256',
  });

  useEffect(() => {
    fetchPackages();
    fetchStats();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const mockPackages = [
        {
          id: 'pkg-1',
          packageName: 'ai-calling-agent-v2.0',
          packageVersion: '2.0.0',
          exportFormat: 'SAFETENSORS',
          deploymentTarget: 'DOCKER',
          status: 'READY',
          estimatedSize: '1.2 GB',
          createdAt: new Date(Date.now() - 86400000 * 2),
        },
        {
          id: 'pkg-2',
          packageName: 'ai-calling-agent-v1.9',
          packageVersion: '1.9.0',
          exportFormat: 'GGUF',
          deploymentTarget: 'OLLAMA',
          status: 'EXPORTED',
          estimatedSize: '0.8 GB',
          createdAt: new Date(Date.now() - 86400000 * 5),
        },
        {
          id: 'pkg-3',
          packageName: 'ai-calling-agent-v1.8',
          packageVersion: '1.8.0',
          exportFormat: 'PYTORCH',
          deploymentTarget: 'AWS_SAGEMAKER',
          status: 'PREPARING',
          estimatedSize: '1.5 GB',
          createdAt: new Date(Date.now() - 86400000 * 7),
        },
      ];
      setPackages(mockPackages);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const mockStats = {
        totalPackages: 15,
        readyPackages: 8,
        exportedPackages: 5,
        preparingPackages: 2,
        totalSize: '18.5 GB',
      };
      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreatePackage = async () => {
    try {
      console.log('Creating package:', newPackage);
      setShowCreateDialog(false);
      fetchPackages();
    } catch (error) {
      console.error('Error creating package:', error);
    }
  };

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

  const getFormatBadge = (format: string) => {
    const colors: Record<string, string> = {
      SAFETENSORS: 'bg-purple-100 text-purple-800',
      GGUF: 'bg-blue-100 text-blue-800',
      PYTORCH: 'bg-orange-100 text-orange-800',
      ONNX: 'bg-green-100 text-green-800',
      TENSORRT: 'bg-red-100 text-red-800',
      TORCHSCRIPT: 'bg-yellow-100 text-yellow-800',
      HUGGINGFACE: 'bg-pink-100 text-pink-800',
    };
    return <Badge variant="outline" className={colors[format]}>{format}</Badge>;
  };

  const getTargetBadge = (target: string) => {
    return <Badge variant="outline">{target.replace(/_/g, ' ')}</Badge>;
  };

  const filteredPackages = packages.filter((pkg) => {
    const matchesSearch = pkg.packageName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFormat = filterFormat === 'all' || pkg.exportFormat === filterFormat;
    const matchesStatus = filterStatus === 'all' || pkg.status === filterStatus;
    return matchesSearch && matchesFormat && matchesStatus;
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
          <h1 className="text-3xl font-bold">Model Packaging Center</h1>
          <p className="text-gray-500 mt-1">
            Prepare and export trained AI models for deployment
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Model Package</DialogTitle>
                <DialogDescription>
                  Configure and prepare your trained model for deployment
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="packageName">Package Name</Label>
                    <Input
                      id="packageName"
                      placeholder="ai-calling-agent-v2.0"
                      value={newPackage.packageName}
                      onChange={(e) =>
                        setNewPackage({ ...newPackage, packageName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="packageVersion">Version</Label>
                    <Input
                      id="packageVersion"
                      placeholder="1.0.0"
                      value={newPackage.packageVersion}
                      onChange={(e) =>
                        setNewPackage({ ...newPackage, packageVersion: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Production-ready AI calling agent model"
                    value={newPackage.packageDescription}
                    onChange={(e) =>
                      setNewPackage({ ...newPackage, packageDescription: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="exportFormat">Export Format</Label>
                    <Select
                      value={newPackage.exportFormat}
                      onValueChange={(value) =>
                        setNewPackage({ ...newPackage, exportFormat: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAFETENSORS">SafeTensors</SelectItem>
                        <SelectItem value="GGUF">GGUF</SelectItem>
                        <SelectItem value="PYTORCH">PyTorch</SelectItem>
                        <SelectItem value="ONNX">ONNX</SelectItem>
                        <SelectItem value="TENSORRT">TensorRT</SelectItem>
                        <SelectItem value="TORCHSCRIPT">TorchScript</SelectItem>
                        <SelectItem value="HUGGINGFACE">Hugging Face</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="deploymentTarget">Deployment Target</Label>
                    <Select
                      value={newPackage.deploymentTarget}
                      onValueChange={(value) =>
                        setNewPackage({ ...newPackage, deploymentTarget: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DOCKER">Docker</SelectItem>
                        <SelectItem value="KUBERNETES">Kubernetes</SelectItem>
                        <SelectItem value="OLLAMA">Ollama</SelectItem>
                        <SelectItem value="VLLM">vLLM</SelectItem>
                        <SelectItem value="AWS_SAGEMAKER">AWS SageMaker</SelectItem>
                        <SelectItem value="AZURE_ML">Azure ML</SelectItem>
                        <SelectItem value="GOOGLE_VERTEX_AI">Google Vertex AI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="compression">Compression</Label>
                    <Select
                      value={newPackage.compression}
                      onValueChange={(value) =>
                        setNewPackage({ ...newPackage, compression: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="GZIP">GZIP</SelectItem>
                        <SelectItem value="BZIP2">BZIP2</SelectItem>
                        <SelectItem value="XZ">XZ</SelectItem>
                        <SelectItem value="ZSTD">ZSTD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="encryption">Encryption</Label>
                    <Select
                      value={newPackage.encryption}
                      onValueChange={(value) =>
                        setNewPackage({ ...newPackage, encryption: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="AES_256">AES-256</SelectItem>
                        <SelectItem value="RSA_2048">RSA-2048</SelectItem>
                        <SelectItem value="GPG">GPG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePackage}>Create Package</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalPackages || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats?.readyPackages || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-600" />
              Exported
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats?.exportedPackages || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Preparing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats?.preparingPackages || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Total Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalSize || '0 GB'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search packages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterFormat} onValueChange={setFilterFormat}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Export Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="SAFETENSORS">SafeTensors</SelectItem>
                <SelectItem value="GGUF">GGUF</SelectItem>
                <SelectItem value="PYTORCH">PyTorch</SelectItem>
                <SelectItem value="ONNX">ONNX</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PREPARING">Preparing</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="EXPORTED">Exported</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Model Packages</CardTitle>
          <CardDescription>
            {filteredPackages.length} package{filteredPackages.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPackages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.packageName}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      v{pkg.packageVersion}
                    </code>
                  </TableCell>
                  <TableCell>{getFormatBadge(pkg.exportFormat)}</TableCell>
                  <TableCell>{getTargetBadge(pkg.deploymentTarget)}</TableCell>
                  <TableCell>{getStatusBadge(pkg.status)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{pkg.estimatedSize}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(pkg.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/training/packages/${pkg.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
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
