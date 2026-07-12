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
import { Plus, Search, Edit, Trash2, Copy, RotateCcw, Eye, MessageSquare } from 'lucide-react';
import { promptApi } from '@/lib/api';
import { Prompt, PromptStatus, PromptFilterDto } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { CreatePromptForm } from './create-prompt-form';
import { toast } from '@/components/ui/toast';

const statusColors: Record<PromptStatus, string> = {
  [PromptStatus.DRAFT]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  [PromptStatus.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [PromptStatus.ARCHIVED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function PromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PromptFilterDto>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const response = await promptApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        filters,
      });
      setPrompts(response.data.data.items);
      setPagination(prev => ({
        ...prev,
        total: response.data.data.meta.total,
        totalPages: response.data.data.meta.totalPages,
      }));
    } catch (error) {
      toast.error('Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, [pagination.page, pagination.limit, filters]);

  const handleDuplicate = async (id: string, name: string) => {
    try {
      await promptApi.duplicate(id, `${name} (Copy)`);
      loadPrompts();
      toast.success('Prompt duplicated successfully');
    } catch (error) {
      toast.error('Failed to duplicate prompt');
    }
  };

  const handleUpdateStatus = async (id: string, status: PromptStatus) => {
    try {
      await promptApi.updateStatus(id, status);
      loadPrompts();
      toast.success('Prompt status updated successfully');
    } catch (error) {
      toast.error('Failed to update prompt status');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await promptApi.restore(id);
      loadPrompts();
      toast.success('Prompt restored successfully');
    } catch (error) {
      toast.error('Failed to restore prompt');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await promptApi.delete(id);
      loadPrompts();
      toast.success('Prompt deleted successfully');
    } catch (error) {
      toast.error('Failed to delete prompt');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value: string, prompt: Prompt) => (
        <div className="space-y-1">
          <div className="font-medium">{value}</div>
          {prompt.description && (
            <div className="text-sm text-muted-foreground line-clamp-2">
              {prompt.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: PromptStatus) => (
        <Badge variant="secondary" className={statusColors[value]}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'version',
      label: 'Version',
      render: (value: string) => (
        <Badge variant="outline">v{value}</Badge>
      ),
    },
    {
      key: 'temperature',
      label: 'Temperature',
      render: (value: number) => value?.toFixed(1) || 'Not set',
    },
    {
      key: 'maxTokens',
      label: 'Max Tokens',
      render: (value: number) => value || 'Not set',
    },
    {
      key: '_count.campaigns',
      label: 'Campaigns',
      render: (value: any, prompt: Prompt) => prompt._count?.campaigns || 0,
    },
    {
      key: 'updatedAt',
      label: 'Last Modified',
      sortable: true,
      render: (value: string) => formatDate(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, prompt: Prompt) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/dashboard/prompts/${prompt.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/dashboard/prompts/${prompt.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDuplicate(prompt.id, prompt.name)}
          >
            <Copy className="h-4 w-4" />
          </Button>

          {prompt.deletedAt ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleRestore(prompt.id)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDelete(prompt.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Prompts</h2>
          <p className="text-muted-foreground">Manage AI system prompts for automated conversations</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New AI Prompt</DialogTitle>
            </DialogHeader>
            <CreatePromptForm
              onSuccess={() => {
                setShowCreateDialog(false);
                loadPrompts();
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
                placeholder="Search prompts..."
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
                  status: value === 'all' ? undefined : [value as PromptStatus],
                })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={PromptStatus.DRAFT}>Draft</SelectItem>
                <SelectItem value={PromptStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={PromptStatus.ARCHIVED}>Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={prompts}
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
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">No prompts found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first AI prompt to enable automated conversations
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}