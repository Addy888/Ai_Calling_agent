'use client';

import { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  Info,
  Cpu,
  Database,
  Zap,
  Globe,
  HardDrive,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

interface BaseModel {
  id: string;
  registryName: string;
  provider: string;
  family: string;
  versionString: string;
  status: string;
  isActive: boolean;
  description: string | null;
  baseModel: {
    id: string;
    name: string;
    provider: string;
    family: string;
    version: string;
    parameters: string | null;
    contextLength: number | null;
    languages: string[];
    quantizationSupport: string[];
    minimumVram: number | null;
    recommendedVram: number | null;
    license: string | null;
    description: string | null;
    status: string;
  } | null;
}

interface SelectedModel {
  id: string;
  modelRegistryId: string;
  selectionReason: string | null;
  isSelected: boolean;
  confidence: number | null;
  advantages: string[] | null;
  limitations: string[] | null;
  selectedBy: string | null;
  createdAt: string;
  modelRegistry: {
    id: string;
    registryName: string;
    provider: string;
    family: string;
    versionString: string;
    status: string;
    baseModel: any;
  };
  dataset: {
    id: string;
    name: string;
    datasetType: string;
    recordCount: number;
    language: string;
  } | null;
}

interface Recommendation {
  recommendedModelId: string;
  model: {
    id: string;
    name: string;
    provider: string;
    family: string;
    version: string;
    parameters: string;
    contextLength: number;
    languages: string[];
    license: string;
  };
  reason: string;
  confidenceScore: number;
  advantages: string[];
  limitations: string[];
  datasetAnalysis: {
    datasetId: string;
    datasetName: string;
    recordCount: number;
    language: string;
    category: string;
  } | null;
}

export default function ModelSelectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [availableModels, setAvailableModels] = useState<BaseModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [selectedForAction, setSelectedForAction] = useState<BaseModel | null>(null);
  const [selectionReason, setSelectionReason] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAvailableModels(),
        loadSelectedModel(),
        loadDatasets(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load model selection data');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableModels = async () => {
    const response = await fetch('/api/training/model-selection/available-models', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setAvailableModels(data.models || []);
    }
  };

  const loadSelectedModel = async () => {
    const response = await fetch('/api/training/model-selection/selected', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setSelectedModel(data);
    }
  };

  const loadDatasets = async () => {
    const response = await fetch('/api/training/datasets', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setDatasets(data || []);
    }
  };

  const handleSelectModel = async () => {
    if (!selectedForAction) return;

    try {
      const response = await fetch('/api/training/model-selection/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          modelRegistryId: selectedForAction.id,
          datasetId: selectedDatasetId || null,
          selectionReason: selectionReason || 'Manual selection',
        }),
      });

      if (response.ok) {
        toast.success('Base model selected successfully');
        setShowSelectionDialog(false);
        setSelectionReason('');
        setSelectedDatasetId('');
        setSelectedForAction(null);
        await loadData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to select model');
      }
    } catch (error) {
      console.error('Error selecting model:', error);
      toast.error('Failed to select model');
    }
  };

  const handleRemoveSelection = async () => {
    if (!selectedModel) return;

    try {
      const response = await fetch(`/api/training/model-selection/${selectedModel.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        toast.success('Model selection removed');
        await loadData();
      } else {
        toast.error('Failed to remove selection');
      }
    } catch (error) {
      console.error('Error removing selection:', error);
      toast.error('Failed to remove selection');
    }
  };

  const handleGetRecommendation = async (datasetId?: string) => {
    try {
      const response = await fetch('/api/training/model-selection/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          datasetId: datasetId || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendation(data);
        setShowRecommendationDialog(true);
      } else {
        toast.error('Failed to get recommendation');
      }
    } catch (error) {
      console.error('Error getting recommendation:', error);
      toast.error('Failed to get recommendation');
    }
  };

  const handleApplyRecommendation = async () => {
    if (!recommendation) return;

    try {
      const response = await fetch('/api/training/model-selection/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          modelRegistryId: recommendation.recommendedModelId,
          datasetId: recommendation.datasetAnalysis?.datasetId || null,
          selectionReason: recommendation.reason,
        }),
      });

      if (response.ok) {
        toast.success('Recommended model selected successfully');
        setShowRecommendationDialog(false);
        setRecommendation(null);
        await loadData();
      } else {
        toast.error('Failed to apply recommendation');
      }
    } catch (error) {
      console.error('Error applying recommendation:', error);
      toast.error('Failed to apply recommendation');
    }
  };

  const filteredModels = availableModels.filter(model => {
    const matchesSearch = 
      model.registryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.family.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProvider = filterProvider === 'all' || model.provider === filterProvider;
    const matchesStatus = filterStatus === 'all' || model.status === filterStatus;

    return matchesSearch && matchesProvider && matchesStatus;
  });

  const providers = Array.from(new Set(availableModels.map(m => m.provider)));
  const statuses = Array.from(new Set(availableModels.map(m => m.status)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Base Model Selection</h1>
          <p className="text-muted-foreground mt-2">
            Select the optimal base model for your fine-tuning requirements
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadData()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => handleGetRecommendation()}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Get Recommendation
          </Button>
        </div>
      </div>

      {/* Selected Model Summary */}
      {selectedModel && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="ml-2">
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-green-900">Currently Selected:</strong>{' '}
                <span className="text-green-800">
                  {selectedModel.modelRegistry.registryName} (
                  {selectedModel.modelRegistry.provider} - {selectedModel.modelRegistry.family})
                </span>
                {selectedModel.dataset && (
                  <span className="text-green-700 ml-2">
                    for dataset: {selectedModel.dataset.name}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveSelection}
                className="text-red-600 hover:text-red-700"
              >
                Remove Selection
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">Browse Models</TabsTrigger>
          <TabsTrigger value="compare">Compare Models</TabsTrigger>
          <TabsTrigger value="selected">Selected Model</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Models</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search models..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label>Provider</Label>
                  <Select value={filterProvider} onValueChange={setFilterProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Providers</SelectItem>
                      {providers.map(provider => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statuses.map(status => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Models List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels.map(model => (
              <Card 
                key={model.id}
                className={`hover:shadow-lg transition-shadow ${
                  selectedModel?.modelRegistryId === model.id ? 'border-green-500 border-2' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{model.registryName}</CardTitle>
                      <CardDescription>
                        {model.provider} • {model.family}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={model.status === 'READY' ? 'default' : 'secondary'}
                    >
                      {model.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {model.baseModel && (
                    <>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Parameters:</span>
                          <span>{model.baseModel.parameters || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Context:</span>
                          <span>{model.baseModel.contextLength?.toLocaleString() || 'N/A'} tokens</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Min VRAM:</span>
                          <span>{model.baseModel.minimumVram || 'N/A'} GB</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Languages:</span>
                          <span>{model.baseModel.languages?.length || 0} supported</span>
                        </div>
                      </div>

                      {model.baseModel.description && (
                        <p className="text-sm text-muted-foreground">
                          {model.baseModel.description}
                        </p>
                      )}
                    </>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setSelectedForAction(model);
                        setShowSelectionDialog(true);
                      }}
                      disabled={!model.isActive || selectedModel?.modelRegistryId === model.id}
                    >
                      {selectedModel?.modelRegistryId === model.id ? 'Selected' : 'Select Model'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredModels.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No models found matching your criteria</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="compare">
          <Card>
            <CardHeader>
              <CardTitle>Model Comparison</CardTitle>
              <CardDescription>
                Compare multiple models side-by-side (feature coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Model comparison feature will be available soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="selected">
          {selectedModel ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Selected Model Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Model Name</Label>
                      <p className="font-medium">{selectedModel.modelRegistry.registryName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Provider</Label>
                      <p className="font-medium">{selectedModel.modelRegistry.provider}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Family</Label>
                      <p className="font-medium">{selectedModel.modelRegistry.family}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Version</Label>
                      <p className="font-medium">{selectedModel.modelRegistry.versionString}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <Badge>{selectedModel.modelRegistry.status}</Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Selected At</Label>
                      <p className="font-medium">
                        {new Date(selectedModel.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {selectedModel.modelRegistry.baseModel && (
                    <>
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">Model Specifications</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Parameters</Label>
                            <p className="font-medium">
                              {selectedModel.modelRegistry.baseModel.parameters || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Context Length</Label>
                            <p className="font-medium">
                              {selectedModel.modelRegistry.baseModel.contextLength?.toLocaleString() || 'N/A'} tokens
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Minimum VRAM</Label>
                            <p className="font-medium">
                              {selectedModel.modelRegistry.baseModel.minimumVram || 'N/A'} GB
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Recommended VRAM</Label>
                            <p className="font-medium">
                              {selectedModel.modelRegistry.baseModel.recommendedVram || 'N/A'} GB
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">License</Label>
                            <p className="font-medium">
                              {selectedModel.modelRegistry.baseModel.license || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Languages</Label>
                            <p className="font-medium">
                              {selectedModel.modelRegistry.baseModel.languages?.length || 0} supported
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedModel.selectionReason && (
                    <div className="border-t pt-4">
                      <Label className="text-muted-foreground">Selection Reason</Label>
                      <p className="mt-2">{selectedModel.selectionReason}</p>
                    </div>
                  )}

                  {selectedModel.dataset && (
                    <div className="border-t pt-4">
                      <Label className="text-muted-foreground">Associated Dataset</Label>
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <p className="font-medium">{selectedModel.dataset.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedModel.dataset.datasetType} • {selectedModel.dataset.recordCount.toLocaleString()} records
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No model selected yet</p>
                <Button onClick={() => router.push('#browse')}>
                  Browse Available Models
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Selection Dialog */}
      <Dialog open={showSelectionDialog} onOpenChange={setShowSelectionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Base Model</DialogTitle>
            <DialogDescription>
              Configure the selection for {selectedForAction?.registryName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Dataset (Optional)</Label>
              <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a dataset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific dataset</SelectItem>
                  {datasets.map(dataset => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      {dataset.name} ({dataset.recordCount.toLocaleString()} records)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Selection Reason</Label>
              <Textarea
                placeholder="Why are you selecting this model?"
                value={selectionReason}
                onChange={(e) => setSelectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSelectionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSelectModel}>
              Select Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recommendation Dialog */}
      <Dialog open={showRecommendationDialog} onOpenChange={setShowRecommendationDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Model Recommendation
            </DialogTitle>
            <DialogDescription>
              Based on your requirements and dataset analysis
            </DialogDescription>
          </DialogHeader>

          {recommendation && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{recommendation.model.name}</CardTitle>
                  <CardDescription>
                    {recommendation.model.provider} • {recommendation.model.family} • v{recommendation.model.version}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Confidence Score</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${recommendation.confidenceScore * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round(recommendation.confidenceScore * 100)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Recommendation Reason</Label>
                    <p className="mt-1">{recommendation.reason}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-green-700">Advantages</Label>
                      <ul className="mt-2 space-y-1">
                        {recommendation.advantages.map((adv, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                            <span>{adv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <Label className="text-orange-700">Limitations</Label>
                      <ul className="mt-2 space-y-1">
                        {recommendation.limitations.map((lim, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <Info className="h-4 w-4 text-orange-600 mt-0.5" />
                            <span>{lim}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {recommendation.datasetAnalysis && (
                    <div className="border-t pt-4">
                      <Label className="text-muted-foreground">Dataset Analysis</Label>
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <p className="font-medium">{recommendation.datasetAnalysis.datasetName}</p>
                        <p className="text-sm text-muted-foreground">
                          {recommendation.datasetAnalysis.recordCount.toLocaleString()} records • 
                          {recommendation.datasetAnalysis.language} • 
                          {recommendation.datasetAnalysis.category}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecommendationDialog(false)}>
              Dismiss
            </Button>
            <Button onClick={handleApplyRecommendation}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Apply Recommendation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
