'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

interface VoiceConfiguration {
  speakingSpeed: number;
  pitch: number;
  volume: number;
  pauseBetweenSentences: number;
  pauseBetweenParagraphs: number;
  voiceTemperature?: number;
}

interface VoiceSettingsProps {
  agentId: string;
}

export function VoiceSettings({ agentId }: VoiceSettingsProps) {
  const [config, setConfig] = useState<VoiceConfiguration>({
    speakingSpeed: 1.0,
    pitch: 1.0,
    volume: 1.0,
    pauseBetweenSentences: 300,
    pauseBetweenParagraphs: 600,
    voiceTemperature: 0.7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfiguration();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const response = await fetch('/api/v1/voice-studio/configuration', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/v1/voice-studio/configuration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Voice settings saved successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Voice Settings</h3>
          <p className="text-sm text-gray-600">
            Configure voice generation parameters
          </p>
        </div>
        <Button onClick={saveConfiguration} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Speaking Speed</CardTitle>
            <CardDescription>
              Adjust the pace of speech (0.5x to 2.0x)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Speed</Label>
                <span className="text-sm text-gray-600">{config.speakingSpeed.toFixed(1)}x</span>
              </div>
              <Slider
                value={[config.speakingSpeed]}
                onValueChange={([value]) =>
                  setConfig({ ...config, speakingSpeed: value })
                }
                min={0.5}
                max={2.0}
                step={0.1}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Slower</span>
                <span>Normal</span>
                <span>Faster</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pitch</CardTitle>
            <CardDescription>
              Adjust voice pitch (0.5x to 2.0x)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Pitch</Label>
                <span className="text-sm text-gray-600">{config.pitch.toFixed(1)}x</span>
              </div>
              <Slider
                value={[config.pitch]}
                onValueChange={([value]) => setConfig({ ...config, pitch: value })}
                min={0.5}
                max={2.0}
                step={0.1}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Lower</span>
                <span>Normal</span>
                <span>Higher</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume</CardTitle>
            <CardDescription>
              Adjust output volume (0% to 100%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Volume</Label>
                <span className="text-sm text-gray-600">{Math.round(config.volume * 100)}%</span>
              </div>
              <Slider
                value={[config.volume]}
                onValueChange={([value]) => setConfig({ ...config, volume: value })}
                min={0}
                max={1}
                step={0.01}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Quiet</span>
                <span>Medium</span>
                <span>Loud</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voice Temperature</CardTitle>
            <CardDescription>
              Control voice variation (0.0 to 1.0)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Temperature</Label>
                <span className="text-sm text-gray-600">
                  {config.voiceTemperature?.toFixed(1) || '0.7'}
                </span>
              </div>
              <Slider
                value={[config.voiceTemperature || 0.7]}
                onValueChange={([value]) =>
                  setConfig({ ...config, voiceTemperature: value })
                }
                min={0}
                max={1}
                step={0.1}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Consistent</span>
                <span>Balanced</span>
                <span>Varied</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pause Settings</CardTitle>
          <CardDescription>
            Configure pause durations in milliseconds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Pause Between Sentences</Label>
              <span className="text-sm text-gray-600">{config.pauseBetweenSentences}ms</span>
            </div>
            <Slider
              value={[config.pauseBetweenSentences]}
              onValueChange={([value]) =>
                setConfig({ ...config, pauseBetweenSentences: value })
              }
              min={0}
              max={2000}
              step={100}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>No pause</span>
              <span>1 second</span>
              <span>2 seconds</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Pause Between Paragraphs</Label>
              <span className="text-sm text-gray-600">{config.pauseBetweenParagraphs}ms</span>
            </div>
            <Slider
              value={[config.pauseBetweenParagraphs]}
              onValueChange={([value]) =>
                setConfig({ ...config, pauseBetweenParagraphs: value })
              }
              min={0}
              max={5000}
              step={100}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>No pause</span>
              <span>2.5 seconds</span>
              <span>5 seconds</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
