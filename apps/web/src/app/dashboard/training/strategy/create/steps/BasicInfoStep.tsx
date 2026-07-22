'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BasicInfoStep({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Define the name, type, and configuration for your training strategy.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Strategy Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Customer Service Fine-Tuning Strategy"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe the purpose and goals of this training strategy..."
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            rows={4}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="strategyType">Strategy Type *</Label>
            <Select
              value={formData.strategyType}
              onValueChange={(value) => updateFormData({ strategyType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPERVISED_FINE_TUNING">Supervised Fine-Tuning</SelectItem>
                <SelectItem value="INSTRUCTION_TUNING">Instruction Tuning</SelectItem>
                <SelectItem value="CONVERSATION_FINE_TUNING">Conversation Fine-Tuning</SelectItem>
                <SelectItem value="DOMAIN_ADAPTATION">Domain Adaptation</SelectItem>
                <SelectItem value="MULTI_TASK_LEARNING">Multi-Task Learning</SelectItem>
                <SelectItem value="CONTINUAL_LEARNING">Continual Learning</SelectItem>
                <SelectItem value="CURRICULUM_LEARNING">Curriculum Learning</SelectItem>
                <SelectItem value="MULTI_STAGE_FINE_TUNING">Multi-Stage Fine-Tuning</SelectItem>
                <SelectItem value="ADAPTER_BASED_TRAINING">Adapter-Based Training</SelectItem>
                <SelectItem value="CUSTOM_STRATEGY">Custom Strategy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pipelineType">Pipeline Type *</Label>
            <Select
              value={formData.pipelineType}
              onValueChange={(value) => updateFormData({ pipelineType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SINGLE_STAGE">Single Stage</SelectItem>
                <SelectItem value="MULTI_STAGE">Multi-Stage</SelectItem>
                <SelectItem value="SEQUENTIAL_TRAINING">Sequential Training</SelectItem>
                <SelectItem value="PARALLEL_DATASET_PREPARATION">Parallel Dataset Preparation</SelectItem>
                <SelectItem value="HYBRID_STRATEGY">Hybrid Strategy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
