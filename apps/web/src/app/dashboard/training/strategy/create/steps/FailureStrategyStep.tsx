'use client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export default function FailureStrategyStep({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div><h3 className="text-lg font-semibold mb-4">Failure Strategy</h3></div>
      <div className="grid gap-6">
        <div className="space-y-2">
          <Label>Retry Count</Label>
          <Input type="number" value={formData.retryCount} onChange={(e) => updateFormData({ retryCount: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Rollback Strategy</Label>
          <Select value={formData.rollbackStrategy} onValueChange={(value) => updateFormData({ rollbackStrategy: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LAST_CHECKPOINT">Last Checkpoint</SelectItem>
              <SelectItem value="BEST_CHECKPOINT">Best Checkpoint</SelectItem>
              <SelectItem value="SPECIFIC_CHECKPOINT">Specific Checkpoint</SelectItem>
              <SelectItem value="NO_ROLLBACK">No Rollback</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
