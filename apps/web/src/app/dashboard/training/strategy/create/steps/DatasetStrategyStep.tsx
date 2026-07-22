'use client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database } from 'lucide-react';
export default function DatasetStrategyStep({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />Dataset Strategy</h3>
        <p className="text-sm text-muted-foreground mb-6">Configure dataset assignments and priorities.</p>
      </div>
      <div className="grid gap-6">
        <div className="space-y-2">
          <Label>Primary Dataset *</Label>
          <Select value={formData.primaryDatasetId} onValueChange={(value) => updateFormData({ primaryDatasetId: value })}>
            <SelectTrigger><SelectValue placeholder="Select primary dataset" /></SelectTrigger>
            <SelectContent><SelectItem value="dataset-1">Dataset 1</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
