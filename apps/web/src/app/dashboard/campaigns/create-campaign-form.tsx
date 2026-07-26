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
import { CreateCampaignDto, CampaignStatus, Script, Prompt, PromptStatus } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { ContactSelector } from './components/contact-selector';

const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(255, 'Campaign name is too long'),
  description: z.string().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  scriptId: z.string().optional(),
  promptId: z.string().optional(),
  notes: z.string().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface CreateCampaignFormProps {
  onSuccess?: () => void;
}

export function CreateCampaignForm({ onSuccess }: CreateCampaignFormProps) {
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      status: CampaignStatus.DRAFT,
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
      toast({ title: 'Error', description: 'Failed to load scripts and prompts', variant: 'destructive' });
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const onSubmit = async (data: CampaignFormData) => {
    // Validate contacts are selected
    if (selectedContacts.length === 0) {
      toast({ 
        title: 'Validation Error', 
        description: 'Please select at least one contact before creating the campaign', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setLoading(true);
      
      // Create campaign
      const campaignResponse = await campaignApi.create(data);
      const campaignId = campaignResponse.data.data.id;
      
      // Assign contacts
      await campaignApi.assignContacts(campaignId, { contactIds: selectedContacts });
      toast({ 
        title: 'Success', 
        description: `Campaign created with ${selectedContacts.length} contacts assigned` 
      });
      
      onSuccess?.();
      form.reset();
      setSelectedContacts([]);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create campaign', variant: 'destructive' });
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

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...form.register('notes')}
          placeholder="Additional notes about the campaign"
          rows={3}
        />
      </div>

      {/* Contact Selection Section */}
      <div className="space-y-2">
        <ContactSelector
          selectedContactIds={selectedContacts}
          onSelectionChange={setSelectedContacts}
        />
        {selectedContacts.length === 0 && (
          <p className="text-sm text-red-600">
            ⚠️ Please select at least one contact. Campaigns cannot be created without contacts.
          </p>
        )}
        {selectedContacts.length > 0 && (
          <p className="text-sm text-green-600">
            ✓ {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={loading || selectedContacts.length === 0}>
          {loading && <Spinner className="mr-2" />}
          Create Campaign
        </Button>
      </div>
    </form>
  );
}
