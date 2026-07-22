'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Settings, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CreateFineTuningConfigPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [baseModels, setBaseModels] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trainingMethod: '',
    baseModelId: '',
    datasetId: '',
    configurationVersion: '1.0.0',
    precision: 'FP32',
    tags: {},
  });

  const [loraConfig, setLoraConfig] = useState({
    r: 8,
    alpha: 16,
    dropout: 0.1,
    targetModules: ['q_proj', 'v_proj'],
    bias: 'none',
    fanInFanOut: false,
    taskType: 'CAUSAL_LM',
  });

  const [qloraConfig, setQloraConfig] = useState({
    load_in_4bit: true,
    bnb_4bit_quant_type: 'NF4',
    bnb_4bit_use_double_quant: true,
    bnb_4bit_compute_dtype: 'BF16',
  });

  const [peftConfig, setPeftConfig] = useState({
    method: 'LORA',
    num_virtual_tokens: 20,
    encoder_hidden_size: 128,
    prefix_projection: false,
  });

  useEffect(() => {
    fetchBaseModels();
    fetchDatasets();
  }, []);

  const fetchBaseModels = async () => {
    try {
      const response = await fetch('/api/training/model-registry', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const result = await response.json();
        setBaseModels(result.models || []);
      }
    } catch (error) {
      console.error('Failed to fetch base models:', error);
    }
  };

  const fetchDatasets = async () => {
    try {
      const response = await fetch('/api/ai-agent/training-datasets', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const result = await response.json();
        setDatasets(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.trainingMethod) {
      toast({
        title: 'Validation Error',
        description: 'Name and training method are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        ...formData,
      };

      // Add method-specific configs
      if (['LORA', 'QLORA'].includes(formData.trainingMethod)) {
        payload.loraConfig = loraConfig;
      }

      if (formData.trainingMethod === 'QLORA') {
        payload.qloraConfig = qloraConfig;
      }

      if (['LORA', 'QLORA', 'ADAPTER_BASED'].includes(formData.trainingMethod)) {
        payload.peftConfig = peftConfig;
      }

      const response = await fetch('/api/training/fine-tuning-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Success',
          description: 'Fine-tuning configuration created successfully',
        });
        router.push(`/dashboard/training/fine-tuning/${result.id}`);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create configuration');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const showLoRAConfig = ['LORA', 'QLORA'].includes(formData.trainingMethod);
  const showQLoRAConfig = formData.trainingMethod === 'QLORA';
  const showPEFTConfig = ['LORA', 'QLORA', 'ADAPTER_BASED'].includes(formData.trainingMethod);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Create Fine-Tuning Configuration</h1>
          <p className="text-muted-foreground">
            Configure parameters for model fine-tuning
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Creating...' : 'Create Configuration'}
        </Button>
      </div>

      {/* Configuration Form */}
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Configuration</TabsTrigger>
          {showLoRAConfig && <TabsTrigger value="lora">LoRA Configuration</TabsTrigger>}
          {showQLoRAConfig && <TabsTrigger value="qlora">QLoRA Configuration</TabsTrigger>}
          {showPEFTConfig && <TabsTrigger value="peft">PEFT Configuration</TabsTrigger>}
        </TabsList>

        {/* Basic Configuration */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                General configuration details and training method selection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Configuration Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Customer Support LoRA Fine-Tuning"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Configuration Version</Label>
                  <Input
                    id="version"
                    placeholder="1.0.0"
                    value={formData.configurationVersion}
                    onChange={(e) =>
                      setFormData({ ...formData, configurationVersion: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose of this fine-tuning configuration..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="trainingMethod">Training Method *</Label>
                  <Select
                    value={formData.trainingMethod}
                    onValueChange={(value) => setFormData({ ...formData, trainingMethod: value })}
                  >
                    <SelectTrigger id="trainingMethod">
                      <SelectValue placeholder="Select training method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPERVISED_FINE_TUNING">
                        Supervised Fine-Tuning
                      </SelectItem>
                      <SelectItem value="INSTRUCTION_FINE_TUNING">
                        Instruction Fine-Tuning
                      </SelectItem>
                      <SelectItem value="CONVERSATION_FINE_TUNING">
                        Conversation Fine-Tuning
                      </SelectItem>
                      <SelectItem value="DOMAIN_ADAPTATION">Domain Adaptation</SelectItem>
                      <SelectItem value="LORA">LoRA</SelectItem>
                      <SelectItem value="QLORA">QLoRA</SelectItem>
                      <SelectItem value="ADAPTER_BASED">Adapter Based</SelectItem>
                      <SelectItem value="FULL_FINE_TUNING">Full Fine-Tuning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precision">Precision</Label>
                  <Select
                    value={formData.precision}
                    onValueChange={(value) => setFormData({ ...formData, precision: value })}
                  >
                    <SelectTrigger id="precision">
                      <SelectValue placeholder="Select precision" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FP32">FP32 (32-bit floating point)</SelectItem>
                      <SelectItem value="FP16">FP16 (16-bit floating point)</SelectItem>
                      <SelectItem value="BF16">BF16 (Brain Float 16)</SelectItem>
                      <SelectItem value="INT8">INT8 (8-bit integer)</SelectItem>
                      <SelectItem value="INT4">INT4 (4-bit integer)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="baseModel">Base Model</Label>
                  <Select
                    value={formData.baseModelId}
                    onValueChange={(value) => setFormData({ ...formData, baseModelId: value })}
                  >
                    <SelectTrigger id="baseModel">
                      <SelectValue placeholder="Select base model" />
                    </SelectTrigger>
                    <SelectContent>
                      {baseModels.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No models available
                        </SelectItem>
                      ) : (
                        baseModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.registryName} v{model.versionString}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataset">Training Dataset</Label>
                  <Select
                    value={formData.datasetId}
                    onValueChange={(value) => setFormData({ ...formData, datasetId: value })}
                  >
                    <SelectTrigger id="dataset">
                      <SelectValue placeholder="Select dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No datasets available
                        </SelectItem>
                      ) : (
                        datasets.map((dataset) => (
                          <SelectItem key={dataset.id} value={dataset.id}>
                            {dataset.name} ({dataset.recordCount} records)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LoRA Configuration */}
        {showLoRAConfig && (
          <TabsContent value="lora" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>LoRA Configuration</CardTitle>
                <CardDescription>
                  Low-Rank Adaptation parameters for efficient fine-tuning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="lora_r">Rank (r)</Label>
                    <Input
                      id="lora_r"
                      type="number"
                      min="1"
                      max="512"
                      value={loraConfig.r}
                      onChange={(e) =>
                        setLoraConfig({ ...loraConfig, r: parseInt(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 4-64. Lower is faster but less expressive
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lora_alpha">Alpha</Label>
                    <Input
                      id="lora_alpha"
                      type="number"
                      min="1"
                      max="512"
                      value={loraConfig.alpha}
                      onChange={(e) =>
                        setLoraConfig({ ...loraConfig, alpha: parseInt(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Typically 2x rank. Controls learning rate scaling
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lora_dropout">Dropout</Label>
                    <Input
                      id="lora_dropout"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={loraConfig.dropout}
                      onChange={(e) =>
                        setLoraConfig({ ...loraConfig, dropout: parseFloat(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 0.05-0.3 for regularization
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lora_task">Task Type</Label>
                  <Select
                    value={loraConfig.taskType}
                    onValueChange={(value) => setLoraConfig({ ...loraConfig, taskType: value })}
                  >
                    <SelectTrigger id="lora_task">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAUSAL_LM">Causal Language Model</SelectItem>
                      <SelectItem value="SEQ_2_SEQ_LM">Sequence-to-Sequence</SelectItem>
                      <SelectItem value="TOKEN_CLS">Token Classification</SelectItem>
                      <SelectItem value="SEQ_CLS">Sequence Classification</SelectItem>
                      <SelectItem value="QUESTION_ANS">Question Answering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Modules</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['q_proj', 'v_proj', 'k_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'].map((module) => (
                      <div key={module} className="flex items-center space-x-2">
                        <Checkbox
                          id={module}
                          checked={loraConfig.targetModules.includes(module)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setLoraConfig({
                                ...loraConfig,
                                targetModules: [...loraConfig.targetModules, module],
                              });
                            } else {
                              setLoraConfig({
                                ...loraConfig,
                                targetModules: loraConfig.targetModules.filter((m) => m !== module),
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor={module}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {module}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* QLoRA Configuration */}
        {showQLoRAConfig && (
          <TabsContent value="qlora" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>QLoRA Configuration</CardTitle>
                <CardDescription>
                  Quantized LoRA settings for memory-efficient training
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="load_in_4bit"
                    checked={qloraConfig.load_in_4bit}
                    onCheckedChange={(checked) =>
                      setQloraConfig({ ...qloraConfig, load_in_4bit: !!checked })
                    }
                  />
                  <label htmlFor="load_in_4bit" className="text-sm font-medium">
                    Load model in 4-bit quantization
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="quant_type">Quantization Type</Label>
                    <Select
                      value={qloraConfig.bnb_4bit_quant_type}
                      onValueChange={(value) =>
                        setQloraConfig({ ...qloraConfig, bnb_4bit_quant_type: value })
                      }
                    >
                      <SelectTrigger id="quant_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FP4">FP4 (4-bit Float)</SelectItem>
                        <SelectItem value="NF4">NF4 (4-bit NormalFloat - Recommended)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="compute_dtype">Compute Data Type</Label>
                    <Select
                      value={qloraConfig.bnb_4bit_compute_dtype}
                      onValueChange={(value) =>
                        setQloraConfig({ ...qloraConfig, bnb_4bit_compute_dtype: value })
                      }
                    >
                      <SelectTrigger id="compute_dtype">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FP32">FP32</SelectItem>
                        <SelectItem value="FP16">FP16</SelectItem>
                        <SelectItem value="BF16">BF16 (Recommended)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="double_quant"
                    checked={qloraConfig.bnb_4bit_use_double_quant}
                    onCheckedChange={(checked) =>
                      setQloraConfig({ ...qloraConfig, bnb_4bit_use_double_quant: !!checked })
                    }
                  />
                  <label htmlFor="double_quant" className="text-sm font-medium">
                    Use double quantization (saves additional memory)
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* PEFT Configuration */}
        {showPEFTConfig && (
          <TabsContent value="peft" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>PEFT Configuration</CardTitle>
                <CardDescription>
                  Parameter-Efficient Fine-Tuning method selection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="peft_method">PEFT Method</Label>
                  <Select
                    value={peftConfig.method}
                    onValueChange={(value) => setPeftConfig({ ...peftConfig, method: value })}
                  >
                    <SelectTrigger id="peft_method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROMPT_TUNING">Prompt Tuning</SelectItem>
                      <SelectItem value="PREFIX_TUNING">Prefix Tuning</SelectItem>
                      <SelectItem value="P_TUNING">P-Tuning</SelectItem>
                      <SelectItem value="ADAPTER_TUNING">Adapter Tuning</SelectItem>
                      <SelectItem value="IA3">IA³</SelectItem>
                      <SelectItem value="LORA">LoRA</SelectItem>
                      <SelectItem value="QLORA">QLoRA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {['PROMPT_TUNING', 'PREFIX_TUNING', 'P_TUNING'].includes(peftConfig.method) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="virtual_tokens">Number of Virtual Tokens</Label>
                      <Input
                        id="virtual_tokens"
                        type="number"
                        min="1"
                        max="1000"
                        value={peftConfig.num_virtual_tokens}
                        onChange={(e) =>
                          setPeftConfig({
                            ...peftConfig,
                            num_virtual_tokens: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="encoder_hidden">Encoder Hidden Size</Label>
                      <Input
                        id="encoder_hidden"
                        type="number"
                        min="64"
                        max="2048"
                        value={peftConfig.encoder_hidden_size}
                        onChange={(e) =>
                          setPeftConfig({
                            ...peftConfig,
                            encoder_hidden_size: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {peftConfig.method === 'PREFIX_TUNING' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="prefix_proj"
                      checked={peftConfig.prefix_projection}
                      onCheckedChange={(checked) =>
                        setPeftConfig({ ...peftConfig, prefix_projection: !!checked })
                      }
                    />
                    <label htmlFor="prefix_proj" className="text-sm font-medium">
                      Enable prefix projection
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
