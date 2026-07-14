'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Eye, Save } from 'lucide-react';
import { scriptApi } from '@/lib/api';
import { Script, UpdateScriptDto, ScriptLanguage } from '@/types';
import { toast } from '@/components/ui/use-toast';

const scriptSchema = z.object({
  name: z.string().min(1, 'Script name is required').max(255, 'Script name is too long'),
  description: z.string().optional(),
  content: z.string().min(1, 'Script content is required'),
  language: z.nativeEnum(ScriptLanguage).optional(),
  version: z.string().optional(),
  isActive: z.boolean().optional(),
});

type ScriptFormData = z.infer<typeof scriptSchema>;

interface EditScriptFormProps {
  script: Script;
  onSuccess?: () => void;
}

export function EditScriptForm({ script, onSuccess }: EditScriptFormProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [previewContent, setPreviewContent] = useState('');

  const form = useForm<ScriptFormData>({
    resolver: zodResolver(scriptSchema),
    defaultValues: {
      name: script.name,
      description: script.description || '',
      content: script.content,
      language: script.language,
      version: script.version,
      isActive: script.isActive,
    },
  });

  const watchedContent = form.watch('content');

  const onSubmit = async (data: ScriptFormData) => {
    try {
      setLoading(true);
      await scriptApi.update(script.id, data);
      toast({ title: 'Success', description: 'Script updated successfully' });
      onSuccess?.();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update script', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      const response = await scriptApi.preview(script.id);
      setPreviewContent(response.data.data.preview);
      setActiveTab('preview');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate preview', variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Script Name *</Label>
          <Input
            id="name"
            {...form.register('name')}
            placeholder="Enter script name"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={form.watch('language')}
            onValueChange={(value) => form.setValue('language', value as ScriptLanguage)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ScriptLanguage.ENGLISH}>English</SelectItem>
              <SelectItem value={ScriptLanguage.HINDI}>Hindi</SelectItem>
              <SelectItem value={ScriptLanguage.MARATHI}>Marathi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register('description')}
          placeholder="Enter script description"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            {...form.register('version')}
            placeholder="e.g., 1.0.0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="isActive">Status</Label>
          <Select
            value={form.watch('isActive')?.toString()}
            onValueChange={(value) => form.setValue('isActive', value === 'true')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Script Content *</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={!watchedContent}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="mt-4">
              <Textarea
                {...form.register('content')}
                placeholder="Enter your script content here. Use {variables} for dynamic content."
                rows={15}
                className="font-mono text-sm"
              />
              {form.formState.errors.content && (
                <p className="text-sm text-red-500 mt-2">{form.formState.errors.content.message}</p>
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="p-4 border rounded-lg bg-muted min-h-[300px]">
                {previewContent ? (
                  <pre className="whitespace-pre-wrap text-sm">{previewContent}</pre>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Click "Preview" button to see how your script will look with sample data
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="variables" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You can use these variables in your script. They will be replaced with actual values during calls:
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium">Contact Variables</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li><code>{'{firstName}'}</code> - Contact's first name</li>
                      <li><code>{'{lastName}'}</code> - Contact's last name</li>
                      <li><code>{'{phone}'}</code> - Contact's phone number</li>
                      <li><code>{'{email}'}</code> - Contact's email address</li>
                      <li><code>{'{company}'}</code> - Contact's company</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Agent Variables</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li><code>{'{agentName}'}</code> - Agent's name</li>
                      <li><code>{'{companyName}'}</code> - Your company name</li>
                      <li><code>{'{campaignName}'}</code> - Campaign name</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Spinner className="mr-2" />}
          <Save className="mr-2 h-4 w-4" />
          Update Script
        </Button>
      </div>
    </form>
  );
}