'use client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
export default function EvaluationStrategyStep({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div><h3 className="text-lg font-semibold mb-4">Evaluation Strategy</h3></div>
      <div className="grid gap-6">
        <div className="space-y-2">
          <Label>Evaluation Interval</Label>
          <Input type="number" value={formData.evaluationInterval} onChange={(e) => updateFormData({ evaluationInterval: Number(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Automatic Best Model Selection</Label>
          <Switch checked={formData.automaticBestModelSelection} onCheckedChange={(checked) => updateFormData({ automaticBestModelSelection: checked })} />
        </div>
      </div>
    </div>
  );
}
