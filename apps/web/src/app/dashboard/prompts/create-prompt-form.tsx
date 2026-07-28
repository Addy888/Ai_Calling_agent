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
import { Wand2, Info } from 'lucide-react';
import { promptApi } from '@/lib/api';
import { CreatePromptDto, PromptStatus } from '@/types';
import { toast } from '@/components/ui/use-toast';

const promptSchema = z.object({
  name: z.string().min(1, 'Prompt name is required').max(255, 'Prompt name is too long'),
  description: z.string().optional(),
  content: z.string().min(1, 'Prompt content is required'),
  version: z.string().optional(),
  status: z.nativeEnum(PromptStatus).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(32000).optional(),
});

type PromptFormData = z.infer<typeof promptSchema>;

interface CreatePromptFormProps {
  onSuccess?: () => void;
}

const samplePrompts = {
  sales: `You are an expert sales assistant for {companyName}. Your role is to help potential customers understand how our services can benefit their business.

Key Guidelines:
- Be friendly, professional, and helpful
- Listen actively to customer needs
- Ask qualifying questions to understand their pain points
- Present solutions that directly address their challenges
- Handle objections with empathy and facts
- Guide the conversation towards a positive outcome

Current Context:
- Customer Name: {firstName} {lastName}
- Company: {customerCompany}
- Phone: {phone}
- Previous interactions: {previousInteractions}

Remember to:
1. Build rapport early in the conversation
2. Focus on value proposition, not just features
3. Use customer's name naturally throughout the conversation
4. Address concerns directly and honestly
5. Always end with a clear next step

Maintain a conversational tone while staying focused on helping the customer achieve their goals.`,

  support: `You are a helpful customer support representative for {companyName}. Your primary goal is to resolve customer issues quickly and effectively while maintaining a positive customer experience.

Key Guidelines:
- Be empathetic and understanding
- Listen carefully to the customer's issue
- Ask clarifying questions when needed
- Provide clear, step-by-step solutions
- Escalate to appropriate departments when necessary
- Follow up to ensure resolution

Current Context:
- Customer Name: {firstName} {lastName}
- Account/ID: {customerAccount}
- Issue Type: {issueType}
- Previous tickets: {previousTickets}

Resolution Process:
1. Acknowledge the customer's frustration or concern
2. Gather all necessary information about the issue
3. Provide a clear explanation of the solution
4. Verify the solution works for the customer
5. Document the resolution for future reference

Always maintain professionalism while being genuinely helpful and caring about the customer's experience.`,

  survey: `You are conducting a customer satisfaction survey for {companyName}. Your goal is to gather honest feedback to help improve our services while keeping the conversation engaging and brief.

Key Guidelines:
- Be polite and respectful of the customer's time
- Explain the purpose and duration of the survey upfront
- Ask open-ended questions to get detailed feedback
- Listen actively without being defensive
- Thank the customer for their valuable input
- Keep the survey concise and focused

Current Context:
- Customer Name: {firstName} {lastName}
- Service/Product: {serviceUsed}
- Purchase Date: {purchaseDate}
- Survey Type: {surveyType}

Survey Structure:
1. Brief introduction and time estimate
2. Overall satisfaction rating
3. Specific experience questions
4. Improvement suggestions
5. Likelihood to recommend
6. Thank you and next steps

Remember to maintain a friendly, professional tone throughout the conversation and respect if the customer declines to participate.`,
};

export function CreatePromptForm({ onSuccess }: CreatePromptFormProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  const form = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      status: PromptStatus.DRAFT,
      version: '1.0.0',
      temperature: 0.7,
      maxTokens: 4000,
    },
  });

  const onSubmit = async (data: PromptFormData) => {
    try {
      setLoading(true);
      await promptApi.create(data);
      toast({ title: 'Success', description: 'Prompt created successfully' });
      onSuccess?.();
      form.reset();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create prompt', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadSamplePrompt = (type: keyof typeof samplePrompts) => {
    form.setValue('content', samplePrompts[type]);
  };

  return (
    <>
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0" style={{ overflowX: 'hidden' }}>
        <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Prompt Name *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Enter prompt name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(value) => form.setValue('status', value as PromptStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PromptStatus.DRAFT}>Draft</SelectItem>
                <SelectItem value={PromptStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={PromptStatus.ARCHIVED}>Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...form.register('description')}
            placeholder="Enter prompt description"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              {...form.register('version')}
              placeholder="e.g., 1.0.0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              {...form.register('temperature', { valueAsNumber: true })}
              placeholder="0.7"
            />
            {form.formState.errors.temperature && (
              <p className="text-sm text-red-500">{form.formState.errors.temperature.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTokens">Max Tokens</Label>
            <Input
              id="maxTokens"
              type="number"
              min="1"
              max="32000"
              {...form.register('maxTokens', { valueAsNumber: true })}
              placeholder="4000"
            />
            {form.formState.errors.maxTokens && (
              <p className="text-sm text-red-500">{form.formState.errors.maxTokens.message}</p>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Prompt Content *</CardTitle>
              <div className="flex items-center gap-2">
                <Select onValueChange={(value) => loadSamplePrompt(value as keyof typeof samplePrompts)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Load sample prompt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Assistant</SelectItem>
                    <SelectItem value="support">Customer Support</SelectItem>
                    <SelectItem value="survey">Customer Survey</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="mt-4">
                <Textarea
                  {...form.register('content')}
                  placeholder="Enter your AI system prompt here. Be specific about the role, guidelines, and expected behavior."
                  rows={15}
                  className="font-mono text-sm"
                />
                {form.formState.errors.content && (
                  <p className="text-sm text-red-500 mt-2">{form.formState.errors.content.message}</p>
                )}
              </TabsContent>

              <TabsContent value="variables" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Info className="h-4 w-4" />
                    <span>Use these variables in your prompt to personalize conversations</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <h4 className="font-medium">Contact Variables</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li><code>{'{firstName}'}</code> - Contact's first name</li>
                        <li><code>{'{lastName}'}</code> - Contact's last name</li>
                        <li><code>{'{phone}'}</code> - Contact's phone number</li>
                        <li><code>{'{email}'}</code> - Contact's email address</li>
                        <li><code>{'{customerCompany}'}</code> - Contact's company</li>
                        <li><code>{'{designation}'}</code> - Contact's job title</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Campaign Variables</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li><code>{'{companyName}'}</code> - Your company name</li>
                        <li><code>{'{campaignName}'}</code> - Campaign name</li>
                        <li><code>{'{agentName}'}</code> - Agent's name</li>
                        <li><code>{'{callTime}'}</code> - Current time</li>
                        <li><code>{'{previousInteractions}'}</code> - Past interactions</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="guidelines" className="mt-4">
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Writing Effective AI Prompts</h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• <strong>Be specific:</strong> Clearly define the AI's role and responsibilities</li>
                      <li>• <strong>Set context:</strong> Provide relevant background information</li>
                      <li>• <strong>Define guidelines:</strong> Specify do's and don'ts for the AI</li>
                      <li>• <strong>Include examples:</strong> Show expected input/output patterns</li>
                      <li>• <strong>Set tone:</strong> Specify the desired communication style</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Temperature Settings</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <strong>0.0-0.3:</strong> More focused and deterministic responses</li>
                      <li>• <strong>0.4-0.7:</strong> Balanced creativity and consistency (recommended)</li>
                      <li>• <strong>0.8-1.0:</strong> More creative and varied responses</li>
                      <li>• <strong>1.1-2.0:</strong> Very creative, potentially unpredictable</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Token Limits</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <strong>1000-2000:</strong> Short conversations, quick responses</li>
                      <li>• <strong>2000-4000:</strong> Standard conversations (recommended)</li>
                      <li>• <strong>4000-8000:</strong> Longer, detailed conversations</li>
                      <li>• <strong>8000+:</strong> Extended dialogues, complex scenarios</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Fixed Footer with Buttons */}
      <div className="flex-shrink-0 px-6 py-4 border-t bg-background">
        <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.setValue('status', PromptStatus.DRAFT);
            form.handleSubmit(onSubmit)();
          }}
          disabled={loading}
        >
          {loading && <Spinner className="mr-2" />}
          Save Draft
        </Button>
        <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={loading}>
          {loading && <Spinner className="mr-2" />}
          Create Prompt
        </Button>
        </div>
      </div>
    </>
  );
}