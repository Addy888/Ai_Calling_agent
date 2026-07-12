'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { 
  Edit, 
  Copy, 
  Trash2, 
  RotateCcw, 
  MessageSquare, 
  Thermometer,
  Hash,
  Calendar
} from 'lucide-react';
import { promptApi } from '@/lib/api';
import { Prompt, PromptStatus } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { toast } from '@/components/ui/toast';

const statusColors: Record<PromptStatus, string> = {
  [PromptStatus.DRAFT]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  [PromptStatus.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [PromptStatus.ARCHIVED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function PromptDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const promptId = params.id as string;
  
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPrompt = async () => {
    try {
      setLoading(true);
      const response = await promptApi.getById(promptId);
      setPrompt(response.data.data);
    } catch (error) {
      toast.error('Failed to load prompt details');
      router.push('/dashboard/prompts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (promptId) {
      loadPrompt();
    }
  }, [promptId]);

  const handleDuplicate = async () => {
    try {
      await promptApi.duplicate(promptId, `${prompt?.name} (Copy)`);
      toast.success('Prompt duplicated successfully');
      router.push('/dashboard/prompts');
    } catch (error) {
      toast.error('Failed to duplicate prompt');
    }
  };

  const handleUpdateStatus = async (status: PromptStatus) => {
    try {
      await promptApi.updateStatus(promptId, status);
      loadPrompt();
      toast.success('Prompt status updated successfully');
    } catch (error) {
      toast.error('Failed to update prompt status');
    }
  };

  const handleRestore = async () => {
    try {
      await promptApi.restore(promptId);
      loadPrompt();
      toast.success('Prompt restored successfully');
    } catch (error) {
      toast.error('Failed to restore prompt');
    }
  };

  const handleDelete = async () => {
    try {
      await promptApi.delete(promptId);
      toast.success('Prompt deleted successfully');
      router.push('/dashboard/prompts');
    } catch (error) {
      toast.error('Failed to delete prompt');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Prompt not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">{prompt.name}</h2>
            <Badge variant="secondary" className={statusColors[prompt.status]}>
              {prompt.status}
            </Badge>
            <Badge variant="outline">v{prompt.version}</Badge>
          </div>
          <p className="text-muted-foreground">{prompt.description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {prompt.status === PromptStatus.DRAFT && (
            <Button
              variant="outline"
              onClick={() => handleUpdateStatus(PromptStatus.ACTIVE)}
            >
              Activate
            </Button>
          )}
          
          {prompt.status === PromptStatus.ACTIVE && (
            <Button
              variant="outline"
              onClick={() => handleUpdateStatus(PromptStatus.ARCHIVED)}
            >
              Archive
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/prompts/${promptId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>

          {prompt.deletedAt ? (
            <Button variant="outline" onClick={handleRestore}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </Button>
          ) : (
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prompt._count?.campaigns || 0}</div>
            <p className="text-xs text-muted-foreground">Using this prompt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prompt.temperature || 'Not set'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Tokens</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prompt.maxTokens || 'Not set'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(prompt.updatedAt)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Prompt Content</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>AI Prompt Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted">
                <pre className="whitespace-pre-wrap text-sm font-mono">{prompt.content}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Associated Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {prompt.campaigns && prompt.campaigns.length > 0 ? (
                <div className="space-y-4">
                  {prompt.campaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{campaign.name}</h4>
                        <p className="text-sm text-muted-foreground">Status: {campaign.status}</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                      >
                        View Campaign
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold text-foreground">No campaigns using this prompt</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This prompt is not currently assigned to any campaigns
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>AI Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Temperature</label>
                  <div className="mt-1 text-sm">
                    {prompt.temperature !== undefined ? prompt.temperature : 'Not configured'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Controls randomness in responses (0.0-2.0)
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Max Tokens</label>
                  <div className="mt-1 text-sm">
                    {prompt.maxTokens || 'Not configured'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum length of generated responses
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Version Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Version</label>
                  <div className="mt-1 text-sm font-mono">{prompt.version}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <div className="mt-1 text-sm">{formatDateTime(prompt.createdAt)}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Modified</label>
                  <div className="mt-1 text-sm">{formatDateTime(prompt.updatedAt)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}