'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { scriptApi, scriptEngineApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Plus,
  Trash2,
  GitBranch,
  Variable
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function ScriptEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const scriptId = params?.id as string;

  const [script, setScript] = useState<any>(null);
  const [version, setVersion] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    if (scriptId) {
      fetchScript();
    }
  }, [scriptId]);

  const fetchScript = async () => {
    try {
      setLoading(true);
      const response = await scriptApi.getById(scriptId);
      const scriptData = response.data.data;
      setScript(scriptData);

      const versionsResponse = await scriptApi.getVersionHistory(scriptId);
      const versions = versionsResponse.data.data || [];

      if (versions.length > 0) {
        const latestVersion = versions[0];
        await fetchVersion(latestVersion.id);
      } else {
        await createInitialVersion();
      }
    } catch (error) {
      console.error('Failed to fetch script:', error);
      toast({
        title: 'Error',
        description: 'Failed to load script',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createInitialVersion = async () => {
    try {
      const response = await scriptEngineApi.createVersion({
        scriptId: scriptId,
        version: '1.0.0',
        description: 'Initial version',
      });
      const versionData = response.data.data;
      setVersion(versionData);
      setNodes(versionData.nodes || []);
      setBranches(versionData.branches || []);
      setVariables(versionData.variables || []);
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  };

  const fetchVersion = async (versionId: string) => {
    try {
      const response = await scriptEngineApi.getVersion(versionId);
      const versionData = response.data.data;
      setVersion(versionData);
      setNodes(versionData.nodes || []);
      setBranches(versionData.branches || []);
      setVariables(versionData.variables || []);
    } catch (error) {
      console.error('Failed to fetch version:', error);
    }
  };

  const handleValidate = async () => {
    if (!version) return;

    try {
      const response = await scriptEngineApi.validateScript(version.id);
      setValidation(response.data.data);
      
      if (response.data.data.isValid) {
        toast({
          title: 'Validation Successful',
          description: 'Script is valid and ready to publish',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Validation Failed',
          description: `${response.data.data.errors.length} error(s) found`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Validation failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to validate script',
        variant: 'destructive',
      });
    }
  };

  const handlePublish = async () => {
    if (!version) return;

    try {
      await handleValidate();
      
      if (validation && validation.isValid) {
        await scriptEngineApi.publishVersion(version.id);
        toast({
          title: 'Success',
          description: 'Script published successfully',
          variant: 'default',
        });
        fetchVersion(version.id);
      }
    } catch (error) {
      console.error('Publish failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish script',
        variant: 'destructive',
      });
    }
  };

  const handleAddNode = async (type: string) => {
    if (!version) return;

    try {
      const nodeId = `node_${Date.now()}`;
      const response = await scriptEngineApi.createNode({
        versionId: version.id,
        nodeId: nodeId,
        type: type,
        name: `New ${type} Node`,
        content: '',
        order: nodes.length,
        isEntryPoint: nodes.length === 0,
        isExitPoint: type === 'END',
      });

      setNodes([...nodes, response.data.data]);
      toast({
        title: 'Success',
        description: 'Node added successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to add node:', error);
      toast({
        title: 'Error',
        description: 'Failed to add node',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    try {
      await scriptEngineApi.deleteNode(nodeId);
      setNodes(nodes.filter((n) => n.id !== nodeId));
      toast({
        title: 'Success',
        description: 'Node deleted successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to delete node:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete node',
        variant: 'destructive',
      });
    }
  };

  const handleAddVariable = async () => {
    if (!version) return;

    try {
      const response = await scriptEngineApi.createVariable({
        versionId: version.id,
        name: `variable_${Date.now()}`,
        type: 'STRING',
        description: 'New variable',
      });

      setVariables([...variables, response.data.data]);
      toast({
        title: 'Success',
        description: 'Variable added successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to add variable:', error);
      toast({
        title: 'Error',
        description: 'Failed to add variable',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">Loading script...</p>
      </div>
    );
  }

  if (!script || !version) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">Script not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{script.name}</h1>
            <p className="text-muted-foreground mt-1">
              Version {version.version} • {version.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleValidate}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Validate
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/script-builder/${scriptId}/preview`)}>
            <Play className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={handlePublish} disabled={version.status === 'PUBLISHED'}>
            <Save className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      {validation && (
        <Card className="p-4">
          <div className="space-y-2">
            {validation.isValid ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Script is valid</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">{validation.errors.length} error(s) found</span>
              </div>
            )}
            
            {validation.errors && validation.errors.length > 0 && (
              <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                {validation.errors.map((error: string, index: number) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            )}
            
            {validation.warnings && validation.warnings.length > 0 && (
              <ul className="list-disc list-inside text-sm text-yellow-600 space-y-1">
                {validation.warnings.map((warning: string, index: number) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            )}

            {validation.stats && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <span>Nodes: {validation.stats.totalNodes}</span>
                <span>Branches: {validation.stats.totalBranches}</span>
                <span>Variables: {validation.stats.totalVariables}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      <Tabs defaultValue="flow" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flow">Flow Designer</TabsTrigger>
          <TabsTrigger value="nodes">Nodes</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
        </TabsList>

        <TabsContent value="flow" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Flow Designer</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleAddNode('START')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Start
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAddNode('MESSAGE')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Message
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAddNode('QUESTION')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Question
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAddNode('CONDITION')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Condition
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAddNode('END')}>
                  <Plus className="mr-2 h-4 w-4" />
                  End
                </Button>
              </div>
            </div>
            
            <div className="border rounded-lg p-8 min-h-[500px] bg-muted/10">
              <div className="text-center text-muted-foreground">
                <p className="mb-4">Visual Flow Designer</p>
                <p className="text-sm">
                  Drag & Drop functionality will be integrated with a flow library
                </p>
                <p className="text-sm mt-2">
                  Current nodes: {nodes.length} | Branches: {branches.length}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="nodes" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Script Nodes</h3>
              <Button size="sm" onClick={() => handleAddNode('MESSAGE')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Node
              </Button>
            </div>

            {nodes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No nodes yet</p>
            ) : (
              <div className="space-y-3">
                {nodes.map((node) => (
                  <Card key={node.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{node.type}</Badge>
                          <h4 className="font-medium">{node.name}</h4>
                          {node.isEntryPoint && <Badge variant="default">Entry</Badge>}
                          {node.isExitPoint && <Badge variant="secondary">Exit</Badge>}
                        </div>
                        {node.content && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {node.content}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteNode(node.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Script Variables</h3>
              <Button size="sm" onClick={handleAddVariable}>
                <Plus className="mr-2 h-4 w-4" />
                Add Variable
              </Button>
            </div>

            {variables.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No variables yet</p>
            ) : (
              <div className="space-y-3">
                {variables.map((variable) => (
                  <Card key={variable.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Variable className="h-4 w-4" />
                          <h4 className="font-medium">{variable.name}</h4>
                          <Badge variant="outline">{variable.type}</Badge>
                          {variable.isRequired && <Badge variant="default">Required</Badge>}
                        </div>
                        {variable.description && (
                          <p className="text-sm text-muted-foreground">
                            {variable.description}
                          </p>
                        )}
                        {variable.defaultValue && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Default: {variable.defaultValue}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Script Branches</h3>
            </div>

            {branches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No branches yet</p>
            ) : (
              <div className="space-y-3">
                {branches.map((branch) => (
                  <Card key={branch.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <GitBranch className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{branch.fromNode?.name}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{branch.toNode?.name}</span>
                        </div>
                        {branch.label && (
                          <p className="text-sm text-muted-foreground mt-1">{branch.label}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
