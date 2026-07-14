'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function EvaluationConfigurationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    enableAutoEvaluation: true,
    minimumScoreThreshold: 70,
    hallucinationThreshold: 0.3,
    confidenceThreshold: 0.7,
    scriptComplianceWeight: 0.15,
    knowledgeAccuracyWeight: 0.20,
    decisionAccuracyWeight: 0.20,
    conversationQualityWeight: 0.15,
    leadQualityWeight: 0.10,
    safetyWeight: 0.10,
    businessRuleWeight: 0.05,
    memoryWeight: 0.05,
  });

  useEffect(() => {
    fetchConfiguration();
  }, []);

  const fetchConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/evaluation/configuration');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to load configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const totalWeight =
      config.scriptComplianceWeight +
      config.knowledgeAccuracyWeight +
      config.decisionAccuracyWeight +
      config.conversationQualityWeight +
      config.leadQualityWeight +
      config.safetyWeight +
      config.businessRuleWeight +
      config.memoryWeight;

    if (Math.abs(totalWeight - 1.0) > 0.01) {
      toast({
        title: 'Invalid Weights',
        description: 'All weights must sum to 1.0',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/evaluation/configuration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Configuration saved successfully',
        });
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      enableAutoEvaluation: true,
      minimumScoreThreshold: 70,
      hallucinationThreshold: 0.3,
      confidenceThreshold: 0.7,
      scriptComplianceWeight: 0.15,
      knowledgeAccuracyWeight: 0.20,
      decisionAccuracyWeight: 0.20,
      conversationQualityWeight: 0.15,
      leadQualityWeight: 0.10,
      safetyWeight: 0.10,
      businessRuleWeight: 0.05,
      memoryWeight: 0.05,
    });
  };

  const totalWeight =
    config.scriptComplianceWeight +
    config.knowledgeAccuracyWeight +
    config.decisionAccuracyWeight +
    config.conversationQualityWeight +
    config.leadQualityWeight +
    config.safetyWeight +
    config.businessRuleWeight +
    config.memoryWeight;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Evaluation Configuration</h1>
          <p className="text-gray-500 mt-1">
            Configure evaluation parameters and scoring weights
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure basic evaluation behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Evaluation</Label>
              <p className="text-sm text-gray-500">
                Automatically evaluate conversations after completion
              </p>
            </div>
            <Switch
              checked={config.enableAutoEvaluation}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enableAutoEvaluation: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Minimum Score Threshold</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[config.minimumScoreThreshold]}
                onValueChange={(value) =>
                  setConfig({ ...config, minimumScoreThreshold: value[0] })
                }
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="w-12 text-right font-semibold">
                {config.minimumScoreThreshold}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Conversations below this score will be flagged
            </p>
          </div>

          <div className="space-y-2">
            <Label>Hallucination Risk Threshold</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[config.hallucinationThreshold * 100]}
                onValueChange={(value) =>
                  setConfig({
                    ...config,
                    hallucinationThreshold: value[0] / 100,
                  })
                }
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="w-12 text-right font-semibold">
                {(config.hallucinationThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Risk level above which safety alerts are triggered
            </p>
          </div>

          <div className="space-y-2">
            <Label>Confidence Threshold</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[config.confidenceThreshold * 100]}
                onValueChange={(value) =>
                  setConfig({ ...config, confidenceThreshold: value[0] / 100 })
                }
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="w-12 text-right font-semibold">
                {(config.confidenceThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Minimum confidence level for decisions
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scoring Weights</CardTitle>
          <CardDescription>
            Adjust the importance of each evaluation category (must sum to 1.0)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Conversation Quality</Label>
              <span className="font-semibold">
                {(config.conversationQualityWeight * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[config.conversationQualityWeight * 100]}
              onValueChange={(value) =>
                setConfig({
                  ...config,
                  conversationQualityWeight: value[0] / 100,
                })
              }
              min={0}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Knowledge Accuracy</Label>
              <span className="font-semibold">
                {(config.knowledgeAccuracyWeight * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[config.knowledgeAccuracyWeight * 100]}
              onValueChange={(value) =>
                setConfig({ ...config, knowledgeAccuracyWeight: value[0] / 100 })
              }
              min={0}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Decision Accuracy</Label>
              <span className="font-semibold">
                {(config.decisionAccuracyWeight * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[config.decisionAccuracyWeight * 100]}
              onValueChange={(value) =>
                setConfig({ ...config, decisionAccuracyWeight: value[0] / 100 })
              }
              min={0}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Script Compliance</Label>
              <span className="font-semibold">
                {(config.scriptComplianceWeight * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[config.scriptComplianceWeight * 100]}
              onValueChange={(value) =>
                setConfig({ ...config, scriptComplianceWeight: value[0] / 100 })
              }
              min={0}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Lead Quality</Label>
              <span className="font-semibold">
                {(config.leadQualityWeight * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[config.leadQualityWeight * 100]}
              onValueChange={(value) =>
                setConfig({ ...config, leadQualityWeight: value[0] / 100 })
              }
              min={0}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Safety</Label>
              <span className="font-semibold">
                {(config.safetyWeight * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[config.safetyWeight * 100]}
              onValueChange={(value) =>
                setConfig({ ...config, safetyWeight: value[0] / 100 })
              }
              min={0}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Business Rules</Label>
              <span className="font-semibold">
                {(config.businessRuleWeight * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[config.businessRuleWeight * 100]}
              onValueChange={(value) =>
                setConfig({ ...config, businessRuleWeight: value[0] / 100 })
              }
              min={0}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Memory Usage</Label>
              <span className="font-semibold">
                {(config.memoryWeight * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[config.memoryWeight * 100]}
              onValueChange={(value) =>
                setConfig({ ...config, memoryWeight: value[0] / 100 })
              }
              min={0}
              max={50}
              step={1}
            />
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <Label>Total Weight</Label>
              <span
                className={`text-lg font-bold ${
                  Math.abs(totalWeight - 1.0) < 0.01
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {(totalWeight * 100).toFixed(1)}%
              </span>
            </div>
            {Math.abs(totalWeight - 1.0) >= 0.01 && (
              <p className="text-sm text-red-500 mt-1">
                Weights must sum to exactly 100%
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset} disabled={saving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
