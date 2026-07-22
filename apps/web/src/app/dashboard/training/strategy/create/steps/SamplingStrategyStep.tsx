'use client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export default function SamplingStrategyStep({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div><h3 className="text-lg font-semibold mb-4">Sampling Strategy</h3></div>
      <div className="space-y-2">
        <Label>Sampling Strategy *</Label>
        <Select value={formData.samplingStrategy} onValueChange={(value) => updateFormData({ samplingStrategy: value })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="RANDOM">Random</SelectItem>
            <SelectItem value="SEQUENTIAL">Sequential</SelectItem>
            <SelectItem value="WEIGHTED">Weighted</SelectItem>
            <SelectItem value="BALANCED">Balanced</SelectItem>
            <SelectItem value="CURRICULUM">Curriculum</SelectItem>
            <SelectItem value="ADAPTIVE">Adaptive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
