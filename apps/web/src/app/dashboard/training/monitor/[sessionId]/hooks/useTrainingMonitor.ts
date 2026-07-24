'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface TrainingStatus {
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
  progress: any;
  metrics: any;
  performance: any;
  resources: any;
  checkpoint: any;
  alerts: any[];
}

export function useTrainingMonitor(sessionId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Training data states
  const [status, setStatus] = useState<TrainingStatus | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [resources, setResources] = useState<any>(null);
  const [checkpoint, setCheckpoint] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken'); // Get auth token
    const companyId = localStorage.getItem('companyId'); // Get company ID

    const newSocket = io(`${API_URL}/training-monitor`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to training monitor');
      setIsConnected(true);

      // Subscribe to training session updates
      newSocket.emit('subscribe', { sessionId, companyId });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from training monitor');
      setIsConnected(false);
    });

    newSocket.on('training:status', (data) => {
      setStatus(data);
      setProgress(data.progress);
      setMetrics(data.metrics);
      setPerformance(data.performance);
      setResources(data.resources);
      setCheckpoint(data.checkpoint);
      setAlerts(data.alerts || []);
    });

    newSocket.on('training:progress', (data) => {
      setProgress(data);
    });

    newSocket.on('training:metrics', (data) => {
      setMetrics(data);
    });

    newSocket.on('training:resources', (data) => {
      setResources(data);
    });

    newSocket.on('training:alerts', (data) => {
      setAlerts(data);
    });

    newSocket.on('training:log', (log) => {
      setLogs((prev) => [log, ...prev].slice(0, 100)); // Keep last 100 logs
    });

    newSocket.on('training:timeline-event', (event) => {
      setTimeline((prev) => [event, ...prev]);
    });

    newSocket.on('training:checkpoint', (data) => {
      setCheckpoint(data);
    });

    newSocket.on('training:error', (error) => {
      console.error('Training monitor error:', error);
      setError(error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('unsubscribe', { sessionId });
      newSocket.disconnect();
    };
  }, [sessionId]);

  // Fetch initial data via REST API
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch training status
        const statusRes = await axios.get(
          `${API_URL}/api/training/monitor/status/${sessionId}`,
          { headers }
        );
        setStatus(statusRes.data);
        setProgress(statusRes.data.progress);
        setMetrics(statusRes.data.metrics);
        setPerformance(statusRes.data.performance);
        setResources(statusRes.data.resources);
        setCheckpoint(statusRes.data.checkpoint);
        setAlerts(statusRes.data.alerts || []);

        // Fetch logs
        const logsRes = await axios.get(
          `${API_URL}/api/training/monitor/logs/${sessionId}`,
          { headers, params: { limit: 50 } }
        );
        setLogs(logsRes.data.logs || []);

        // Fetch timeline
        const timelineRes = await axios.get(
          `${API_URL}/api/training/monitor/timeline/${sessionId}`,
          { headers }
        );
        setTimeline(timelineRes.data || []);

        setIsLoading(false);
      } catch (err: any) {
        console.error('Error fetching initial data:', err);
        setError(err.response?.data?.message || 'Failed to load training data');
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [sessionId]);

  // Manual refresh function
  const refreshStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const statusRes = await axios.get(
        `${API_URL}/api/training/monitor/status/${sessionId}`,
        { headers }
      );
      setStatus(statusRes.data);
      setProgress(statusRes.data.progress);
      setMetrics(statusRes.data.metrics);
      setPerformance(statusRes.data.performance);
      setResources(statusRes.data.resources);
      setCheckpoint(statusRes.data.checkpoint);
      setAlerts(statusRes.data.alerts || []);
    } catch (err: any) {
      console.error('Error refreshing status:', err);
      setError(err.response?.data?.message || 'Failed to refresh status');
    }
  }, [sessionId]);

  // Export logs function
  const exportLogs = useCallback(
    async (format: string = 'json') => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.post(
          `${API_URL}/api/training/monitor/logs/${sessionId}/export`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { format },
            responseType: 'blob',
          }
        );

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `training-logs-${sessionId}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err) {
        console.error('Error exporting logs:', err);
      }
    },
    [sessionId]
  );

  return {
    status,
    progress,
    metrics,
    performance,
    resources,
    checkpoint,
    logs,
    timeline,
    alerts,
    isLoading,
    isConnected,
    error,
    refreshStatus,
    exportLogs,
  };
}
