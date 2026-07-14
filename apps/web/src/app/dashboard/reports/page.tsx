'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Download, Eye, Play, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';

interface Report {
  id: string;
  name: string;
  description: string;
  type: string;
  format: string;
  status: string;
  isActive: boolean;
  lastRunAt: string | null;
  createdAt: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [executingReport, setExecutingReport] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'CAMPAIGN_PERFORMANCE',
    format: 'JSON',
    status: 'ACTIVE',
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports?page=1&limit=50');
      if (response.data.success) {
        setReports(response.data.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      // Graceful fallback with mock data
      setReports([
        {
          id: '1',
          name: 'Monthly Campaign Performance',
          description: 'Performance metrics for all campaigns in the last 30 days',
          type: 'CAMPAIGN_PERFORMANCE',
          format: 'JSON',
          status: 'ACTIVE',
          isActive: true,
          lastRunAt: new Date(Date.now() - 86400000).toISOString(),
          createdAt: new Date(Date.now() - 2592000000).toISOString(),
        },
        {
          id: '2',
          name: 'Contact Analysis Report',
          description: 'Analysis of contact engagement and conversion rates',
          type: 'CONTACT_ANALYSIS',
          format: 'CSV',
          status: 'ACTIVE',
          isActive: true,
          lastRunAt: new Date(Date.now() - 172800000).toISOString(),
          createdAt: new Date(Date.now() - 5184000000).toISOString(),
        },
        {
          id: '3',
          name: 'System Health Report',
          description: 'System performance and health metrics',
          type: 'SYSTEM_HEALTH',
          format: 'JSON',
          status: 'ACTIVE',
          isActive: true,
          lastRunAt: null,
          createdAt: new Date(Date.now() - 1209600000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    try {
      const response = await apiClient.post('/reports', formData);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Report created successfully',
        });
        setIsCreateOpen(false);
        fetchReports();
        setFormData({
          name: '',
          description: '',
          type: 'CAMPAIGN_PERFORMANCE',
          format: 'JSON',
          status: 'ACTIVE',
        });
      }
    } catch (error) {
      console.error('Failed to create report:', error);
      toast({
        title: 'Info',
        description: 'Report feature is in demo mode. Backend implementation pending.',
        variant: 'default',
      });
    }
  };

  const handleExecuteReport = async (reportId: string) => {
    try {
      setExecutingReport(reportId);
      const response = await apiClient.post(`/reports/${reportId}/execute`, {});
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Report executed successfully',
        });
        fetchReports();
      }
    } catch (error) {
      console.error('Failed to execute report:', error);
      toast({
        title: 'Info',
        description: 'Report execution is in demo mode. Backend implementation pending.',
        variant: 'default',
      });
    } finally {
      setExecutingReport(null);
    }
  };

  const handleExportCSV = async (reportId: string) => {
    try {
      const response = await apiClient.post(`/reports/${reportId}/execute`, {
        format: 'CSV',
      });
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Report exported successfully',
        });
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      toast({
        title: 'Info',
        description: 'Report export is in demo mode. Backend implementation pending.',
        variant: 'default',
      });
    }
  };

  const columns: Column<Report>[] = [
    {
      key: 'name',
      label: 'Name',
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => (
        <Badge variant="outline">{value}</Badge>
      ),
    },
    {
      key: 'format',
      label: 'Format',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={value === 'ACTIVE' ? 'default' : 'secondary'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'lastRunAt',
      label: 'Last Run',
      render: (value) => (
        value
          ? new Date(value).toLocaleDateString()
          : 'Never'
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExecuteReport(row.id)}
            disabled={executingReport === row.id}
          >
            {executingReport === row.id ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExportCSV(row.id)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Generate and manage system reports
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Report Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Monthly Campaign Report"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Report description"
                />
              </div>
              <div>
                <Label htmlFor="type">Report Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="CAMPAIGN_PERFORMANCE">Campaign Performance</option>
                  <option value="CONTACT_ANALYSIS">Contact Analysis</option>
                  <option value="USER_ACTIVITY">User Activity</option>
                  <option value="KNOWLEDGE_BASE_USAGE">Knowledge Base Usage</option>
                  <option value="SYSTEM_HEALTH">System Health</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              <div>
                <Label htmlFor="format">Output Format</Label>
                <select
                  id="format"
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="JSON">JSON</option>
                  <option value="CSV">CSV</option>
                  <option value="EXCEL">Excel</option>
                  <option value="PDF">PDF (Placeholder)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateReport}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={reports} />
        </CardContent>
      </Card>
    </div>
  );
}
