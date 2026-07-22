'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Target, Activity } from 'lucide-react';

interface TrainingProgress {
  currentEpoch: number;
  totalEpochs: number;
  currentStep: number;
  totalSteps: number;
  trainingProgressPercent: number;
  validationProgressPercent: number;
  checkpointProgressPercent: number;
  estimatedCompletionTime?: string;
  estimatedRemainingSeconds?: number;
}

interface TrainingProgressPanelProps {
  progress: TrainingProgress;
}

export function TrainingProgressPanel({ progress }: TrainingProgressPanelProps) {
  const formatTime = (seconds?: number) => {
    if (!seconds) return 'Calculating...';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Training Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Epoch Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Epoch Progress</span>
            <Badge variant="outline">
              {progress.currentEpoch} / {progress.totalEpochs}
            </Badge>
          </div>
          <Progress 
            value={(progress.currentEpoch / progress.totalEpochs) * 100} 
            className="h-2"
          />
        </div>

        {/* Step Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Step Progress</span>
            <Badge variant="outline">
              {progress.currentStep} / {progress.totalSteps}
            </Badge>
          </div>
          <Progress 
            value={(progress.currentStep / progress.totalSteps) * 100} 
            className="h-2"
          />
        </div>

        {/* Training Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Training Progress
            </span>
            <span className="text-sm font-semibold">
              {progress.trainingProgressPercent.toFixed(1)}%
            </span>
          </div>
          <Progress value={progress.trainingProgressPercent} className="h-2" />
        </div>

        {/* Validation Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Validation Progress
            </span>
            <span className="text-sm font-semibold">
              {progress.validationProgressPercent.toFixed(1)}%
            </span>
          </div>
          <Progress value={progress.validationProgressPercent} className="h-2" />
        </div>

        {/* Checkpoint Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Checkpoint Progress</span>
            <span className="text-sm font-semibold">
              {progress.checkpointProgressPercent.toFixed(1)}%
            </span>
          </div>
          <Progress value={progress.checkpointProgressPercent} className="h-2" />
        </div>

        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Remaining Time
            </p>
            <p className="text-sm font-semibold">
              {formatTime(progress.estimatedRemainingSeconds)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Estimated Completion</p>
            <p className="text-sm font-semibold">
              {formatDate(progress.estimatedCompletionTime)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
