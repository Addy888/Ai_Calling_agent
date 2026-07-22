'use client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export default function LossFunctionStep({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div><h3 className="text-lg font-semibold mb-4">Loss Function</h3></div>
      <div className="space-y-2">
        <Label>Loss Function *</Label>
        <Select value={formData.lossFunction} onValueChange={(value) => updateFormData({ lossFunction: value })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="CROSS_ENTROPY">Cross Entropy</SelectItem>
            <SelectItem value="LABEL_SMOOTHING">Label Smoothing</SelectItem>
            <SelectItem value="WEIGHTED_LOSS">Weighted Loss</SelectItem>
            <SelectItem value="CUSTOM_LOSS">Custom Loss</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
