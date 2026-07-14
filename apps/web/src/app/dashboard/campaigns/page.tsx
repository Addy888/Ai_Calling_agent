'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Play, Pause, Edit, Trash2, Copy, Archive, RotateCcw, Eye } from 'lucide-react';
import { campaignApi } from '@/lib/api';
import { Campaign, CampaignStatus, CampaignFilterDto } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { CreateCampaignForm } from './create-campaign-form';
import { toast } from '@/components/ui/use-toast';

const statusColors: Record<CampaignStatus, string> = {
  [CampaignStatus.DRAFT]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  [CampaignStatus.SCHEDULED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [CampaignStatus.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [CampaignStatus.PAUSED]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [CampaignStatus.COMPLETED]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  [CampaignStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CampaignFilterDto>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await campaignApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        filters,
      });
      setCampaigns(response.data.data.items);
      setPagination(prev => ({
        ...prev,
        total: response.data.data.meta.total,
        totalPages: response.data.data.meta.totalPages,
      }));
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load campaigns', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [pagination.page, pagination.limit, filters]);

  const handleStatusUpdate = async (id: string, status: CampaignStatus) => {
    try {
      await campaignApi.updateStatus(id, status);
      loadCampaigns();
      toast({ title: 'Success', description: 'Campaign status updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update campaign status', variant: 'destructive' });
    }
  };

  const handleClone = async (id: string, name: string) => {
    try {
      await campaignApi.clone(id, `${name} (Copy)`);
      loadCampaigns();
      toast({ title: 'Success', description: 'Campaign cloned successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to clone campaign', variant: 'destructive' });
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await campaignApi.archive(id);
      loadCampaigns();
      toast({ title: 'Success', description: 'Campaign archived successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to archive campaign', variant: 'destructive' });
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await campaignApi.restore(id);
      loadCampaigns();
      toast({ title: 'Success', description: 'Campaign restored successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to restore campaign', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await campaignApi.delete(id);
      loadCampaigns();
      toast({ title: 'Success', description: 'Campaign deleted successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete campaign', variant: 'destructive' });
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value: string, campaign: Campaign) => (
        <div className="space-y-1">
          <div className="font-medium">{value}</div>
          {campaign.description && (
            <div className="text-sm text-muted-foreground">{campaign.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: CampaignStatus) => (
        <Badge variant="secondary" className={statusColors[value]}>
          {value}
        </Badge>
      ),
    },
    {
      key: '_count.contacts',
      label: 'Contacts',
      render: (value: any, campaign: Campaign) => campaign._count?.contacts || 0,
    },
    {
      key: '_count.calls',
      label: 'Calls',
      render: (value: any, campaign: Campaign) => campaign._count?.calls || 0,
    },
    {
      key: 'startDate',
      label: 'Start Date',
      render: (value: string) => value ? formatDate(value) : 'Not set',
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: string) => formatDateTime(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, campaign: Campaign) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {campaign.status === CampaignStatus.ACTIVE && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleStatusUpdate(campaign.id, CampaignStatus.PAUSED)}
            >
              <Pause className="h-4 w-4" />
            </Button>
          )}
          
          {campaign.status === CampaignStatus.PAUSED && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleStatusUpdate(campaign.id, CampaignStatus.ACTIVE)}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/dashboard/campaigns/${campaign.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleClone(campaign.id, campaign.name)}
          >
            <Copy className="h-4 w-4" />
          </Button>

          {campaign.deletedAt ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleRestore(campaign.id)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleArchive(campaign.id)}
              >
                <Archive className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDelete(campaign.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaigns</h2>
          <p className="text-muted-foreground">Manage your calling campaigns</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
            </DialogHeader>
            <CreateCampaignForm
              onSuccess={() => {
                setShowCreateDialog(false);
                loadCampaigns();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.status?.[0] || 'all'}
              onValueChange={(value) => 
                setFilters({
                  ...filters,
                  status: value === 'all' ? undefined : [value as CampaignStatus],
                })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={CampaignStatus.DRAFT}>Draft</SelectItem>
                <SelectItem value={CampaignStatus.SCHEDULED}>Scheduled</SelectItem>
                <SelectItem value={CampaignStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={CampaignStatus.PAUSED}>Paused</SelectItem>
                <SelectItem value={CampaignStatus.COMPLETED}>Completed</SelectItem>
                <SelectItem value={CampaignStatus.CANCELLED}>Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={campaigns}
            columns={columns}
            loading={loading}
            pagination={{
              currentPage: pagination.page,
              totalPages: pagination.totalPages,
              pageSize: pagination.limit,
              total: pagination.total,
              onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
            }}
            emptyState={
              <div className="text-center py-8">
                <p className="text-muted-foreground">No campaigns found</p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
