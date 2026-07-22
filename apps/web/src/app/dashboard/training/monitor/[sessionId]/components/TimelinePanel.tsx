'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Play, 
  CheckCircle, 
  Save, 
  AlertCircle, 
  XCircle,
  Pause,
  Target 
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  eventType: string;
  message: string;
  timestamp: string;
  details?: any;
}

interface TimelinePanelProps {
  timeline: TimelineEvent[];
}

export function TimelinePanel({ timeline }: TimelinePanelProps) {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'TRAINING_STARTED':
        return <Play className="h-4 w-4 text-green-500" />;
      case 'EPOCH_STARTED':
        return <Target className="h-4 w-4 text-blue-500" />;
      case 'VALIDATION_STARTED':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case 'CHECKPOINT_CREATED':
        return <Save className="h-4 w-4 text-yellow-500" />;
      case 'EVALUATION_STARTED':
        return <Target className="h-4 w-4 text-teal-500" />;
      case 'TRAINING_COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'TRAINING_FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'TRAINING_PAUSED':
        return <Pause className="h-4 w-4 text-orange-500" />;
      case 'TRAINING_CANCELLED':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventBadge = (eventType: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'TRAINING_STARTED': 'default',
      'TRAINING_COMPLETED': 'default',
      'TRAINING_FAILED': 'destructive',
      'TRAINING_CANCELLED': 'secondary',
      'CHECKPOINT_CREATED': 'outline',
      'VALIDATION_STARTED': 'outline',
    };
    
    return variants[eventType] || 'secondary';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Training Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[700px] pr-4">
          <div className="space-y-4">
            {timeline.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No timeline events yet
              </div>
            ) : (
              timeline.map((event, index) => (
                <div key={event.id} className="relative">
                  {/* Timeline Line */}
                  {index < timeline.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
                  )}
                  
                  {/* Event Card */}
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center z-10">
                      {getEventIcon(event.eventType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-8">
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{event.message}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTime(event.timestamp)}
                            </p>
                          </div>
                          <Badge variant={getEventBadge(event.eventType)} className="text-xs">
                            {event.eventType.replace(/_/g, ' ')}
                          </Badge>
                        </div>

                        {event.details && (
                          <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded">
                            {typeof event.details === 'string' 
                              ? event.details 
                              : JSON.stringify(event.details, null, 2)
                            }
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
