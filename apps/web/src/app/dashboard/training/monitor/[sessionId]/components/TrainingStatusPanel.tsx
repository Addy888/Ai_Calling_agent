import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Calendar, Clock, Database, Layers, Zap } from 'lucide-react';

interface TrainingStatusPanelProps {
  status: {
    sessionId: string;
    sessionName: string;
    status: string;
    pipelineStatus?: string;
    currentStage?: string;
    trainingMethod?: string;
    baseModel?: string;
    dataset?: string;
    startedTime?: string;
    estimatedCompletion?: string;
  };
}

const statusColors: Record<string, string> = {
  IDLE: 'secondary',
  INITIALIZING: 'default',
  TRAINING: 'default',
  VALIDATING: 'default',
  CHECKPOINTING: 'default',
  PAUSED: 'warning',
  COMPLETED: 'success',
  FAILED: 'destructive',
  CANCELLED: 'secondary',
};

export function TrainingStatusPanel({ status }: TrainingStatusPanelProps) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{status.sessionName}</CardTitle>
          <Badge variant={statusColors[status.status] as any || 'default'}>
            {status.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          <div className="flex items-start gap-3">
            <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Pipeline Status</p>
              <p className="font-medium">{status.pipelineStatus || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Current Stage</p>
              <p className="font-medium">{status.currentStage || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Training Method</p>
              <p className="font-medium">{status.trainingMethod || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Base Model</p>
              <p className="font-medium">{status.baseModel || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Dataset</p>
              <p className="font-medium">{status.dataset || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Started</p>
              <p className="font-medium">
                {status.startedTime 
                  ? new Date(status.startedTime).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
