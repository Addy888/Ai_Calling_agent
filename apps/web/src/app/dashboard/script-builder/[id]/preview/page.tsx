'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { scriptApi, scriptEngineApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, RotateCcw, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ScriptPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const scriptId = params?.id as string;

  const [script, setScript] = useState<any>(null);
  const [version, setVersion] = useState<any>(null);
  const [execution, setExecution] = useState<any>(null);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

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
        const publishedVersion = versions.find((v: any) => v.status === 'PUBLISHED');
        if (publishedVersion) {
          const versionResponse = await scriptEngineApi.getVersion(publishedVersion.id);
          setVersion(versionResponse.data.data);
        } else {
          toast({
            title: 'Warning',
            description: 'No published version found',
            variant: 'default',
          });
        }
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

  const handleStart = async () => {
    if (!version) return;

    try {
      setExecuting(true);
      const response = await scriptEngineApi.executeScript({
        versionId: version.id,
        variables: {},
      });

      const result = response.data.data;
      setExecution(result);
      setConversationHistory([
        {
          type: 'bot',
          message: result.response,
          node: result.currentNode?.name,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Failed to start execution:', error);
      toast({
        title: 'Error',
        description: 'Failed to start script execution',
        variant: 'destructive',
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !execution) return;

    try {
      setExecuting(true);
      
      setConversationHistory([
        ...conversationHistory,
        {
          type: 'user',
          message: userInput,
          timestamp: new Date(),
        },
      ]);

      const response = await scriptEngineApi.executeScript({
        versionId: version.id,
        executionId: execution.executionId,
        userInput: userInput,
        currentNodeId: execution.nextNode?.nodeId,
      });

      const result = response.data.data;
      setExecution(result);
      
      setConversationHistory((prev) => [
        ...prev,
        {
          type: 'bot',
          message: result.response,
          node: result.currentNode?.name,
          timestamp: new Date(),
        },
      ]);

      setUserInput('');

      if (result.isComplete) {
        toast({
          title: 'Conversation Completed',
          description: 'The script has reached its end',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Error',
        description: 'Failed to process message',
        variant: 'destructive',
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleReset = () => {
    setExecution(null);
    setConversationHistory([]);
    setUserInput('');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!script || !version) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No published version available for preview
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
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
            <h1 className="text-3xl font-bold">Script Preview</h1>
            <p className="text-muted-foreground mt-1">
              {script.name} • Version {version.version}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {execution && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Conversation</h3>

            {!execution ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Click Start to begin the conversation preview
                </p>
                <Button onClick={handleStart}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Preview
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {conversationHistory.map((item, index) => (
                    <div
                      key={index}
                      className={`flex ${item.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          item.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {item.node && (
                          <p className="text-xs opacity-70 mb-1">{item.node}</p>
                        )}
                        <p className="text-sm">{item.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {!execution.isComplete && (
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Input
                      placeholder="Type your response..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !executing) {
                          handleSendMessage();
                        }
                      }}
                      disabled={executing}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!userInput.trim() || executing}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {execution.isComplete && (
                  <div className="text-center py-4 border-t">
                    <Badge variant="default">Conversation Complete</Badge>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Execution Details</h3>
            
            {execution ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={execution.isComplete ? 'default' : 'secondary'}>
                    {execution.status}
                  </Badge>
                </div>

                <div>
                  <p className="text-muted-foreground">Current Node</p>
                  <p className="font-medium">{execution.currentNode?.name || 'N/A'}</p>
                </div>

                {execution.nextNode && (
                  <div>
                    <p className="text-muted-foreground">Next Node</p>
                    <p className="font-medium">{execution.nextNode.name}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active execution</p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Variables</h3>
            
            {execution && execution.variables && Object.keys(execution.variables).length > 0 ? (
              <div className="space-y-2 text-sm">
                {Object.entries(execution.variables).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No variables set</p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Script Info</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Version</p>
                <p className="font-medium">{version.version}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant="default">{version.status}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Nodes</p>
                <p className="font-medium">{version.nodes?.length || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Variables</p>
                <p className="font-medium">{version.variables?.length || 0}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
