'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Save, Clock, Award, TrendingUp } from 'lucide-react';

interface CheckpointInfo {
  latestCheckpoint?: string;
  checkpointProgress: number;
  checkpointCount: number;
  bestCheckpoint?: string;
  nextCheckpointETA?: string;
  lastCheckpointTime?: string;
}

interface CheckpointPanelProps {
  checkpoint: CheckpointInfo;
}

export function CheckpointPanel({ checkpoint }: CheckpointPanelProps) {
  const formatTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5" />
          Checkpoint Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress to Next Checkpoint */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Next Checkpoint</span>
            <Badge variant="outline">
              {checkpoint.checkpointProgress.toFixed(0)}%
            </Badge>
          </div>
          <Progress value={checkpoint.checkpointProgress} className="h-2" />
          {checkpoint.nextCheckpointETA && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ETA: {checkpoint.nextCheckpointETA}
            </p>
          )}
        </div>

        {/* Checkpoint Info */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Latest Checkpoint</p>
              <p className="text-sm font-semibold">
                {checkpoint.latestCheckpoint || 'None'}
              </p>
              {checkpoint.lastCheckpointTime && (
                <p className="text-xs text-muted-foreground">
                  {formatTime(checkpoint.lastCheckpointTime)}
                </p>
              )}
            </div>
            <Save className="h-5 w-5 text-blue-500" />
          </div>

          {checkpoint.bestCheckpoint && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  Best Checkpoint
                </p>
                <p className="text-sm font-semibold">
                  {checkpoint.bestCheckpoint}
                </p>
              </div>
              <Award className="h-5 w-5 text-yellow-500" />
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Checkpoints</p>
              <p className="text-sm font-semibold">{checkpoint.checkpointCount}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
