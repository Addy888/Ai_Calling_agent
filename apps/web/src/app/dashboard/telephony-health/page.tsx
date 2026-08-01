'use client';

/**
 * Telephony Health Dashboard
 * Real-time monitoring of GSM Gateway infrastructure
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Wifi,
  WifiOff,
  Server,
  HardDrive,
  Cpu,
  Signal,
  Phone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  components: {
    gateways: {
      total: number;
      online: number;
      offline: number;
      healthPercentage: number;
    };
    sims: {
      total: number;
      active: number;
      busy: number;
      error: number;
      healthPercentage: number;
    };
    connections: {
      total: number;
      active: number;
      inactive: number;
      healthPercentage: number;
    };
  };
  diagnostics: Array<{
    component: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    latency?: number;
  }>;
  systemInfo: {
    platform: string;
    hostname: string;
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
  };
}

interface Gateway {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  ipAddress: string;
  port: number;
  status: string;
  isOnline: boolean;
  totalPorts: number;
  activePorts: number;
  availablePorts: number;
  utilizationPercentage: number;
  totalSIMs: number;
  availableSIMs: number;
  lastSeenAt: string;
}

interface SIM {
  id: string;
  simNumber: string;
  operator: string;
  portNumber: number;
  status: string;
  signal: number;
  isActive: boolean;
  gatewayName: string;
  callsToday: number;
  dailyLimit: number;
  usagePercentage: number;
  lastUsed: string;
  health: string;
}

export default function TelephonyHealthPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [sims, setSims] = useState<SIM[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchHealthData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchHealthData(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchHealthData = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);

    try {
      const [overviewRes, gatewaysRes, simsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/telephony/health/overview`),
        axios.get(`${API_BASE_URL}/telephony/health/gateways`),
        axios.get(`${API_BASE_URL}/telephony/health/sims`),
      ]);

      setHealthStatus(overviewRes.data.data);
      setGateways(gatewaysRes.data.data.gateways);
      setSims(simsRes.data.data.sims);

      if (!silent) {
        toast.success('Health data refreshed');
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      toast.error('Failed to fetch health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'bg-green-100 text-green-800',
      degraded: 'bg-yellow-100 text-yellow-800',
      unhealthy: 'bg-red-100 text-red-800',
      ACTIVE: 'bg-green-100 text-green-800',
      BUSY: 'bg-blue-100 text-blue-800',
      ERROR: 'bg-red-100 text-red-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading health data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Telephony Health Dashboard</h1>
          <p className="text-muted-foreground">Real-time monitoring of GSM Gateway infrastructure</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto-Refresh: ON' : 'Auto-Refresh: OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHealthData()}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      {healthStatus && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(healthStatus.overall)}
              System Status: {healthStatus.overall.toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Gateways */}
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <Server className="h-10 w-10 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">GSM Gateways</p>
                  <p className="text-2xl font-bold">
                    {healthStatus.components.gateways.online}/{healthStatus.components.gateways.total}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {healthStatus.components.gateways.healthPercentage}% healthy
                  </p>
                </div>
              </div>

              {/* SIM Cards */}
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <Phone className="h-10 w-10 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">SIM Cards</p>
                  <p className="text-2xl font-bold">
                    {healthStatus.components.sims.active}/{healthStatus.components.sims.total}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {healthStatus.components.sims.healthPercentage}% available
                  </p>
                </div>
              </div>

              {/* AMI Connections */}
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <Wifi className="h-10 w-10 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">AMI Connections</p>
                  <p className="text-2xl font-bold">
                    {healthStatus.components.connections.active}/{healthStatus.components.connections.total}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {healthStatus.components.connections.healthPercentage}% connected
                  </p>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">CPU: {healthStatus.systemInfo.cpuUsage}%</span>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Memory: {healthStatus.systemInfo.memoryUsage}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Platform: {healthStatus.systemInfo.platform}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Uptime: {Math.floor(healthStatus.systemInfo.uptime / 3600)}h
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="gateways" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gateways">
            <Server className="h-4 w-4 mr-2" />
            Gateways
          </TabsTrigger>
          <TabsTrigger value="sims">
            <Phone className="h-4 w-4 mr-2" />
            SIM Cards
          </TabsTrigger>
          <TabsTrigger value="diagnostics">
            <Activity className="h-4 w-4 mr-2" />
            Diagnostics
          </TabsTrigger>
        </TabsList>

        {/* Gateways Tab */}
        <TabsContent value="gateways" className="space-y-4">
          {gateways.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No gateways configured
              </CardContent>
            </Card>
          ) : (
            gateways.map((gateway) => (
              <Card key={gateway.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {gateway.isOnline ? (
                        <Wifi className="h-5 w-5 text-green-500" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-red-500" />
                      )}
                      <CardTitle>{gateway.name}</CardTitle>
                      {getStatusBadge(gateway.status)}
                    </div>
                    {getStatusBadge(gateway.isOnline ? 'ONLINE' : 'OFFLINE')}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Model</p>
                      <p className="font-medium">{gateway.model}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">IP Address</p>
                      <p className="font-medium">{gateway.ipAddress}:{gateway.port}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Ports</p>
                      <p className="font-medium">
                        {gateway.activePorts}/{gateway.totalPorts}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Utilization</p>
                      <p className="font-medium">{gateway.utilizationPercentage}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">SIM Cards</p>
                      <p className="font-medium">
                        {gateway.availableSIMs}/{gateway.totalSIMs} available
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Manufacturer</p>
                      <p className="font-medium">{gateway.manufacturer || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* SIM Cards Tab */}
        <TabsContent value="sims" className="space-y-4">
          {sims.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No SIM cards configured
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sims.map((sim) => (
                <Card key={sim.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{sim.simNumber}</CardTitle>
                      {getStatusBadge(sim.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Operator</span>
                      <span className="font-medium">{sim.operator}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Gateway</span>
                      <span className="font-medium">{sim.gatewayName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Port</span>
                      <span className="font-medium">{sim.portNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Signal</span>
                      <div className="flex items-center gap-1">
                        <Signal className="h-4 w-4" />
                        <span className="font-medium">{sim.signal}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Usage Today</span>
                      <span className="font-medium">
                        {sim.callsToday}/{sim.dailyLimit} ({sim.usagePercentage}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Health</span>
                      {getStatusBadge(sim.health)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-4">
          {healthStatus?.diagnostics.map((diagnostic, index) => (
            <Card key={index}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(diagnostic.status)}
                    <div>
                      <p className="font-medium">{diagnostic.component}</p>
                      <p className="text-sm text-muted-foreground">{diagnostic.message}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(diagnostic.status)}
                    {diagnostic.latency !== undefined && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {diagnostic.latency}ms
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
