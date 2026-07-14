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
  FileText, 
  Eye, 
  History,
  Play,
  Download
} from 'lucide-react';
import { scriptApi } from '@/lib/api';
import { Script, ScriptLanguage } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const languageLabels: Record<ScriptLanguage, string> = {
  [ScriptLanguage.ENGLISH]: 'English',
  [ScriptLanguage.HINDI]: 'Hindi',
  [ScriptLanguage.MARATHI]: 'Marathi',
};

export default function ScriptDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params.id as string;
  
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewContent, setPreviewContent] = useState('');

  const loadScript = async () => {
    try {
      setLoading(true);
      const response = await scriptApi.getById(scriptId);
      setScript(response.data.data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load script details', variant: 'destructive' });
      router.push('/dashboard/scripts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scriptId) {
      loadScript();
    }
  }, [scriptId]);

  const handlePreview = async () => {
    try {
      const response = await scriptApi.preview(scriptId);
      setPreviewContent(response.data.data.preview);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate preview', variant: 'destructive' });
    }
  };

  const handleDuplicate = async () => {
    try {
      await scriptApi.duplicate(scriptId, `${script?.name} (Copy)`);
      toast({ title: 'Success', description: 'Script duplicated successfully' });
      router.push('/dashboard/scripts');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to duplicate script', variant: 'destructive' });
    }
  };

  const handleRestore = async () => {
    try {
      await scriptApi.restore(scriptId);
      loadScript();
      toast({ title: 'Success', description: 'Script restored successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to restore script', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await scriptApi.delete(scriptId);
      toast({ title: 'Success', description: 'Script deleted successfully' });
      router.push('/dashboard/scripts');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete script', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Script not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">{script.name}</h2>
            <Badge variant="outline">{languageLabels[script.language]}</Badge>
            <Badge variant="secondary">v{script.version}</Badge>
            <Badge variant={script.isActive ? 'default' : 'secondary'}>
              {script.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-muted-foreground">{script.description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/scripts/${scriptId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>

          {script.deletedAt ? (
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{script._count?.campaigns || 0}</div>
            <p className="text-xs text-muted-foreground">Using this script</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Language</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{languageLabels[script.language]}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(script.updatedAt)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Script Content</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Script Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted">
                <pre className="whitespace-pre-wrap text-sm font-mono">{script.content}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Script Preview</CardTitle>
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <Play className="mr-2 h-4 w-4" />
                Generate Preview
              </Button>
            </CardHeader>
            <CardContent>
              {previewContent ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <pre className="whitespace-pre-wrap text-sm">{previewContent}</pre>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Preview generated with sample contact data: John Doe, Agent: Sarah, Company: AI Calling Solutions
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Play className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold text-foreground">No preview generated</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Click "Generate Preview" to see how your script looks with sample data
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Associated Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {script.campaigns && script.campaigns.length > 0 ? (
                <div className="space-y-4">
                  {script.campaigns.map((campaign) => (
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
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold text-foreground">No campaigns using this script</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This script is not currently assigned to any campaigns
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Current</Badge>
                      <span className="font-medium">v{script.version}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Updated {formatDateTime(script.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}