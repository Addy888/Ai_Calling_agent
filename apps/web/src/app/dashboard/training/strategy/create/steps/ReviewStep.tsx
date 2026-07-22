'use client';
import { Badge } from '@/components/ui/badge';
export default function ReviewStep({ formData }: any) {
  return (
    <div className="space-y-6">
      <div><h3 className="text-lg font-semibold mb-4">Review Strategy</h3></div>
      <div className="grid gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-2">Basic Info</h4>
          <p className="text-sm"><strong>Name:</strong> {formData.name}</p>
          <p className="text-sm"><strong>Type:</strong> <Badge>{formData.strategyType}</Badge></p>
          <p className="text-sm"><strong>Pipeline:</strong> <Badge>{formData.pipelineType}</Badge></p>
        </div>
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-2">Objectives</h4>
          <p className="text-sm"><strong>Primary:</strong> {formData.primaryObjective}</p>
        </div>
      </div>
    </div>
  );
}
