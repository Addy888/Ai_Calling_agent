'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function CreateCheckpointConfigPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    saveStrategy: 'SAVE_EVERY_N_STEPS',
    saveIntervalSteps: 500,
    maxCheckpoints: 3,
    autoCleanup: true,
    overwritePolicy: 'OVERWRITE_OLDEST',
    retentionDays: 30,
    recoveryStrategy: 'RESUME_LATEST',
    maxRetryCount: 3,
    resumeAfterCrash: true,
    storageType: 'LOCAL_STORAGE',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch('/api/training/checkpoint-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create configuration');

      const result = await response.json();
      toast({ title: 'Success', description: 'Checkpoint configuration created' });
      router.push(`/dashboard/training/checkpoint/${result.id}`);
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Checkpoint Configuration</h1>
          <p className="text-muted-foreground">Configure checkpoint and recovery settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Production Checkpoint Strategy"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Describe the checkpoint strategy..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Save Strategy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Strategy *</Label>
              <Select
                value={formData.saveStrategy}
                onValueChange={(value) => setFormData({ ...formData, saveStrategy: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAVE_EVERY_N_STEPS">Save Every N Steps</SelectItem>
                  <SelectItem value="SAVE_EVERY_EPOCH">Save Every Epoch</SelectItem>
                  <SelectItem value="SAVE_BEST_MODEL">Save Best Model</SelectItem>
                  <SelectItem value="SAVE_LAST_MODEL">Save Last Model</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.saveStrategy === 'SAVE_EVERY_N_STEPS' && (
              <div className="space-y-2">
                <Label>Save Interval (Steps)</Label>
                <Input
                  type="number"
                  value={formData.saveIntervalSteps}
                  onChange={(e) => setFormData({ ...formData, saveIntervalSteps: Number(e.target.value) })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Max Checkpoints</Label>
              <Input
                type="number"
                value={formData.maxCheckpoints}
                onChange={(e) => setFormData({ ...formData, maxCheckpoints: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto Cleanup</Label>
              <Switch
                checked={formData.autoCleanup}
                onCheckedChange={(checked) => setFormData({ ...formData, autoCleanup: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recovery Strategy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Recovery Strategy *</Label>
              <Select
                value={formData.recoveryStrategy}
                onValueChange={(value) => setFormData({ ...formData, recoveryStrategy: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESUME_LATEST">Resume Latest</SelectItem>
                  <SelectItem value="RESUME_BEST">Resume Best</SelectItem>
                  <SelectItem value="RESUME_MANUAL">Resume Manual</SelectItem>
                  <SelectItem value="RESTART_TRAINING">Restart Training</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Retry Count</Label>
              <Input
                type="number"
                value={formData.maxRetryCount}
                onChange={(e) => setFormData({ ...formData, maxRetryCount: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Resume After Crash</Label>
              <Switch
                checked={formData.resumeAfterCrash}
                onCheckedChange={(checked) => setFormData({ ...formData, resumeAfterCrash: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Create Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
