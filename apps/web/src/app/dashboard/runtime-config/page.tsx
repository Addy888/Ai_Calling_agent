'use client';

import { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

export default function RuntimeConfigPage() {
  const [config, setConfig] = useState<any>({
    temperature: 0.7,
    maxTokens: 4000,
    responseTimeout: 30000,
    memoryLimit: 10000,
    maxContextLength: 8000,
    defaultLanguage: 'en',
    fallbackStrategy: 'RETRY',
    maxRetryCount: 3,
    loggingLevel: 'INFO',
    debugMode: false,
    evaluationMode: false,
    enableCaching: true,
    enableParallelization: true,
    sessionTimeout: 1800,
    maxConcurrentSessions: 100,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/ai-agent/runtime/configuration', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/ai-agent/runtime/configuration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Runtime configuration saved successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = () => {
    setConfig({
      temperature: 0.7,
      maxTokens: 4000,
      responseTimeout: 30000,
      memoryLimit: 10000,
      maxContextLength: 8000,
      defaultLanguage: 'en',
      fallbackStrategy: 'RETRY',
      maxRetryCount: 3,
      loggingLevel: 'INFO',
      debugMode: false,
      evaluationMode: false,
      enableCaching: true,
      enableParallelization: true,
      sessionTimeout: 1800,
      maxConcurrentSessions: 100,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Runtime Configuration</h1>
          <p className="text-gray-600">Configure AI agent runtime parameters</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetConfig}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI Model Configuration</CardTitle>
            <CardDescription>Configure AI model parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature: {config.temperature}</Label>
              <Slider
                id="temperature"
                min={0}
                max={2}
                step={0.1}
                value={[config.temperature]}
                onValueChange={([value]) => setConfig({ ...config, temperature: value })}
              />
              <p className="text-xs text-muted-foreground">
                Controls randomness in AI responses (0 = deterministic, 2 = very random)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                value={config.maxTokens}
                onChange={(e) =>
                  setConfig({ ...config, maxTokens: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum tokens for AI response generation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxContextLength">Max Context Length</Label>
              <Input
                id="maxContextLength"
                type="number"
                value={config.maxContextLength}
                onChange={(e) =>
                  setConfig({ ...config, maxContextLength: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum context window size in tokens
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Runtime Behavior</CardTitle>
            <CardDescription>Configure runtime behavior settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="responseTimeout">Response Timeout (ms)</Label>
              <Input
                id="responseTimeout"
                type="number"
                value={config.responseTimeout}
                onChange={(e) =>
                  setConfig({ ...config, responseTimeout: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum time to wait for AI response
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (seconds)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={config.sessionTimeout}
                onChange={(e) =>
                  setConfig({ ...config, sessionTimeout: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Idle session timeout duration
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxConcurrentSessions">Max Concurrent Sessions</Label>
              <Input
                id="maxConcurrentSessions"
                type="number"
                value={config.maxConcurrentSessions}
                onChange={(e) =>
                  setConfig({ ...config, maxConcurrentSessions: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of concurrent sessions per agent
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Memory & Performance</CardTitle>
            <CardDescription>Configure memory and performance settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="memoryLimit">Memory Limit (tokens)</Label>
              <Input
                id="memoryLimit"
                type="number"
                value={config.memoryLimit}
                onChange={(e) =>
                  setConfig({ ...config, memoryLimit: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum memory size for runtime state
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Caching</Label>
                <p className="text-xs text-muted-foreground">
                  Cache responses for better performance
                </p>
              </div>
              <Switch
                checked={config.enableCaching}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, enableCaching: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Parallelization</Label>
                <p className="text-xs text-muted-foreground">
                  Process multiple requests in parallel
                </p>
              </div>
              <Switch
                checked={config.enableParallelization}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, enableParallelization: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Handling & Logging</CardTitle>
            <CardDescription>Configure error handling and logging</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fallbackStrategy">Fallback Strategy</Label>
              <Select
                value={config.fallbackStrategy}
                onValueChange={(value) =>
                  setConfig({ ...config, fallbackStrategy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RETRY">Retry</SelectItem>
                  <SelectItem value="SKIP">Skip</SelectItem>
                  <SelectItem value="ABORT">Abort</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRetryCount">Max Retry Count</Label>
              <Input
                id="maxRetryCount"
                type="number"
                value={config.maxRetryCount}
                onChange={(e) =>
                  setConfig({ ...config, maxRetryCount: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loggingLevel">Logging Level</Label>
              <Select
                value={config.loggingLevel}
                onValueChange={(value) => setConfig({ ...config, loggingLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBUG">Debug</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="WARN">Warning</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Debug Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Enable detailed debug logging
                </p>
              </div>
              <Switch
                checked={config.debugMode}
                onCheckedChange={(checked) => setConfig({ ...config, debugMode: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Evaluation Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Enable AI response evaluation
                </p>
              </div>
              <Switch
                checked={config.evaluationMode}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, evaluationMode: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Language & Localization</CardTitle>
            <CardDescription>Configure language settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="defaultLanguage">Default Language</Label>
              <Select
                value={config.defaultLanguage}
                onValueChange={(value) =>
                  setConfig({ ...config, defaultLanguage: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
