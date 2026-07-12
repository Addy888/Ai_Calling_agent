'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { campaignApi, scriptApi, promptApi } from '@/lib/api';
import { Campaign, UpdateCampaignDto, CampaignStatus, Script, Prompt, PromptStatus } from '@/types';
import { toast } from '@/components/ui/toast';

const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(255, 'Campaign name is too long'),
  description: z.string().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  scriptId: z.string().optional(),
  promptId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timezone: z.string().optional(),
  notes: z.string().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface EditCampaignFormProps {
  campaign: Campaign;
  onSuccess?: () => void;
}

export function EditCampaignForm({ campaign, onSuccess }: EditCampaignFormProps) {
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: campaign.name,
      description: campaign.description || '',
      status: campaign.status,
      scriptId: campaign.scriptId || '',
      promptId: campaign.promptId || '',
      startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().slice(0, 16) : '',
      endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().slice(0, 16) : '',
      timezone: campaign.timezone || 'America/New_York',
      notes: campaign.notes || '',
    },
  });

  const loadResources = async () => {
    try {
      setLoadingResources(true);
      const [scriptsResponse, promptsResponse] = await Promise.all([
        scriptApi.getAll({ limit: 100, filters: { isActive: true } }),
        promptApi.getAll({ limit: 100, filters: { status: [PromptStatus.ACTIVE] } }),
      ]);
      setScripts(scriptsResponse.data.data.items);
      setPrompts(promptsResponse.data.data.items);
    } catch (error) {
      toast.error('Failed to load scripts and prompts');
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const onSubmit = async (data: CampaignFormData) => {
    try {
      setLoading(true);
      // Convert empty strings to undefined for optional fields
      const updateData: UpdateCampaignDto = {
        ...data,
        scriptId: data.scriptId || undefined,
        promptId: data.promptId || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
      };
      
      await campaignApi.update(campaign.id, updateData);
      toast.success('Campaign updated successfully');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to update campaign');
    } finally {
      setLoading(false);
    }
  };

  if (loadingResources) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Campaign Name *</Label>
          <Input
            id="name"
            {...form.register('name')}
            placeholder="Enter campaign name"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={form.watch('status')}
            onValueChange={(value) => form.setValue('status', value as CampaignStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CampaignStatus.DRAFT}>Draft</SelectItem>
              <SelectItem value={CampaignStatus.SCHEDULED}>Scheduled</SelectItem>
              <SelectItem value={CampaignStatus.ACTIVE}>Active</SelectItem>
              <SelectItem value={CampaignStatus.PAUSED}>Paused</SelectItem>
              <SelectItem value={CampaignStatus.COMPLETED}>Completed</SelectItem>
              <SelectItem value={CampaignStatus.CANCELLED}>Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register('description')}
          placeholder="Enter campaign description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scriptId">Script</Label>
          <Select
            value={form.watch('scriptId') || ''}
            onValueChange={(value) => form.setValue('scriptId', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a script" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No script</SelectItem>
              {scripts.map((script) => (
                <SelectItem key={script.id} value={script.id}>
                  {script.name} (v{script.version})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="promptId">Prompt</Label>
          <Select
            value={form.watch('promptId') || ''}
            onValueChange={(value) => form.setValue('promptId', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a prompt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No prompt</SelectItem>
              {prompts.map((prompt) => (
                <SelectItem key={prompt.id} value={prompt.id}>
                  {prompt.name} (v{prompt.version})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="datetime-local"
            {...form.register('startDate')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="datetime-local"
            {...form.register('endDate')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select
          value={form.watch('timezone') || 'America/New_York'}
          onValueChange={(value) => form.setValue('timezone', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="America/New_York">Eastern Time</SelectItem>
            <SelectItem value="America/Chicago">Central Time</SelectItem>
            <SelectItem value="America/Denver">Mountain Time</SelectItem>
            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
            <SelectItem value="UTC">UTC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...form.register('notes')}
          placeholder="Additional notes about the campaign"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Spinner className="mr-2" />}
          Update Campaign
        </Button>
      </div>
    </form>
  );
}