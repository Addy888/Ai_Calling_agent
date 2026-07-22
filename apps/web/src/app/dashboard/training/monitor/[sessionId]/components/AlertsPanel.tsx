'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, AlertTriangle, AlertCircle, XCircle, X } from 'lucide-react';
import { useState } from 'react';

interface TrainingAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'ERROR';
  message: string;
  details?: string;
  timestamp: string;
}

interface AlertsPanelProps {
  alerts: TrainingAlert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'INFO':
        return <Info className="h-4 w-4" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4" />;
      case 'CRITICAL':
        return <AlertCircle className="h-4 w-4" />;
      case 'ERROR':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (severity: string): 'default' | 'destructive' => {
    return severity === 'CRITICAL' || severity === 'ERROR' ? 'destructive' : 'default';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'INFO':
        return 'bg-blue-500';
      case 'WARNING':
        return 'bg-yellow-500';
      case 'CRITICAL':
        return 'bg-red-500';
      case 'ERROR':
        return 'bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <Alert key={alert.id} variant={getAlertVariant(alert.severity)}>
          <div className="flex items-start gap-3 w-full">
            {getAlertIcon(alert.severity)}
            <div className="flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <AlertDescription className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`${getSeverityColor(alert.severity)} text-white text-xs`}>
                      {alert.severity}
                    </Badge>
                    <span className="font-semibold">{alert.message}</span>
                  </div>
                  {alert.details && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {alert.details}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </AlertDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
}
