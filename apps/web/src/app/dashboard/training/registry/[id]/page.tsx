'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Archive,
  RefreshCw,
  Edit,
  GitBranch,
  History,
  FileText,
  Settings,
  Play,
  Pause,
  Tag,
  Clock,
} from 'lucide-react';

export default function ModelDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params.id as string;

  const [model, setModel] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (modelId) {
      fetchModelDetails();
      fetchVersionHistory();
      fetchModelHistory();
    }
  }, [modelId]);

  const fetchModelDetails = async () => {
    try {
      const response = await fetch(`/api/ai-agent/model-registry/${modelId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setModel(data);
      }
    } catch (error) {
      console.error('Failed to fetch model:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersionHistory = async () => {
    try {
      const response = await fetch(
        `/api/ai-agent/model-registry/${modelId}/versions`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    }
  };

  const fetchModelHistory = async () => {
    try {
      const response = await fetch(
        `/api/ai-agent/model-registry/${modelId}/history`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const handleActivate = async () => {
    try {
      const response = await fetch(
        `/api/ai-agent/model-registry/${modelId}/activate`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ reason: 'Activated from UI' }),
        },
      );

      if (response.ok) {
        await fetchModelDetails();
      }
    } catch (error) {
      console.error('Failed to activate model:', error);
    }
  };

  const handleDeactivate = async () => {
    try {
      const response = await fetch(
        `/api/ai-agent/model-registry/${modelId}/deactivate`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (response.ok) {
        await fetchModelDetails();
      }
    } catch (error) {
      console.error('Failed to deactivate model:', error);
    }
  };

  const handleArchive = async () => {
    try {
      const response = await fetch(
        `/api/ai-agent/model-registry/${modelId}/archive`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ reason: 'Archived from UI' }),
        },
      );

      if (response.ok) {
        await fetchModelDetails();
      }
    } catch (error) {
      console.error('Failed to archive model:', error);
    }
  };

  const handleRestore = async () => {
    try {
      const response = await fetch(
        `/api/ai-agent/model-registry/${modelId}/restore`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (response.ok) {
        await fetchModelDetails();
      }
    } catch (error) {
      console.error('Failed to restore model:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Model not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{model.registryName}</h1>
            <p className="text-muted-foreground">
              {model.provider} • {model.family} • v{model.versionString}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={model.isActive ? 'default' : 'secondary'}>
            {model.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="outline">{model.status}</Badge>
          {model.isLatest && <Badge variant="secondary">Latest</Badge>}
        </div>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {!model.isActive && model.status !== 'ARCHIVED' && (
            <Button onClick={handleActivate}>
              <Play className="h-4 w-4 mr-2" />
              Activate
            </Button>
          )}
          {model.isActive && (
            <Button variant="outline" onClick={handleDeactivate}>
              <Pause className="h-4 w-4 mr-2" />
              Deactivate
            </Button>
          )}
          {model.status !== 'ARCHIVED' && (
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          )}
          {model.status === 'ARCHIVED' && (
            <Button onClick={handleRestore}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restore
            </Button>
          )}
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="versions">
            <GitBranch className="h-4 w-4 mr-2" />
            Versions ({versions.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History ({history.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Registry Name</p>
                  <p className="font-medium">{model.registryName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Version</p>
                  <p className="font-medium">v{model.versionString}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{model.provider}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Family</p>
                  <p className="font-medium">{model.family}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{model.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="font-medium">{model.isActive ? 'Yes' : 'No'}</p>
                </div>
              </div>

              <Separator />

              {model.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p>{model.description}</p>
                </div>
              )}

              {model.baseModel && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Base Model</p>
                  <p className="font-medium">
                    {model.baseModel.name} ({model.baseModel.provider})
                  </p>
                </div>
              )}

              {model.tags && model.tags.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {model.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(model.createdAt).toLocaleString()}
                  </p>
                  {model.createdBy && (
                    <p className="text-xs text-muted-foreground">by {model.createdBy}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {new Date(model.updatedAt).toLocaleString()}
                  </p>
                  {model.updatedBy && (
                    <p className="text-xs text-muted-foreground">by {model.updatedBy}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>All versions of this model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">v{version.versionString}</p>
                        {version.isLatest && (
                          <Badge variant="secondary">Latest</Badge>
                        )}
                        {version.isActive && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {version.status} • {new Date(version.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/training/registry/${version.id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Change History</CardTitle>
              <CardDescription>All changes made to this model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.map((event) => (
                  <div key={event.id} className="flex gap-4 p-4 border rounded-lg">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{event.eventType}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {event.reason && (
                        <p className="text-sm text-muted-foreground">{event.reason}</p>
                      )}
                      {event.changedBy && (
                        <p className="text-xs text-muted-foreground">by {event.changedBy}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Model Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {model.metadata && (
                <pre className="text-sm overflow-auto p-4 bg-muted rounded">
                  {JSON.stringify(model.metadata, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
