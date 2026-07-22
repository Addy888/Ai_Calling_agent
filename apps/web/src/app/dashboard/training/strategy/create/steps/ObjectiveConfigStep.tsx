'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target } from 'lucide-react';

export default function ObjectiveConfigStep({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Training Objectives
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Define the objectives and goals for your training strategy.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="primaryObjective">Primary Objective *</Label>
          <Input
            id="primaryObjective"
            placeholder="e.g., Improve conversation quality and response accuracy"
            value={formData.primaryObjective}
            onChange={(e) => updateFormData({ primaryObjective: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryObjective">Secondary Objective</Label>
          <Input
            id="secondaryObjective"
            placeholder="e.g., Enhance context understanding"
            value={formData.secondaryObjective}
            onChange={(e) => updateFormData({ secondaryObjective: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="conversationObjective">Conversation Objective</Label>
          <Input
            id="conversationObjective"
            placeholder="e.g., Maintain natural dialogue flow"
            value={formData.conversationObjective}
            onChange={(e) => updateFormData({ conversationObjective: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructionObjective">Instruction Objective</Label>
          <Input
            id="instructionObjective"
            placeholder="e.g., Follow complex multi-step instructions"
            value={formData.instructionObjective}
            onChange={(e) => updateFormData({ instructionObjective: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="responseQualityObjective">Response Quality Objective</Label>
          <Input
            id="responseQualityObjective"
            placeholder="e.g., Generate accurate and helpful responses"
            value={formData.responseQualityObjective}
            onChange={(e) => updateFormData({ responseQualityObjective: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="knowledgeRetentionObjective">Knowledge Retention Objective</Label>
          <Input
            id="knowledgeRetentionObjective"
            placeholder="e.g., Maintain previously learned information"
            value={formData.knowledgeRetentionObjective}
            onChange={(e) => updateFormData({ knowledgeRetentionObjective: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
