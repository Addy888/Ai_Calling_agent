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
import { Plus, Search, Edit, Trash2, Copy, RotateCcw, Eye, FileText } from 'lucide-react';
import { scriptApi } from '@/lib/api';
import { Script, ScriptLanguage, ScriptFilterDto } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { CreateScriptForm } from './create-script-form';
import { toast } from '@/components/ui/use-toast';

const languageLabels: Record<ScriptLanguage, string> = {
  [ScriptLanguage.ENGLISH]: 'English',
  [ScriptLanguage.HINDI]: 'Hindi',
  [ScriptLanguage.MARATHI]: 'Marathi',
};

export default function ScriptsPage() {
  const router = useRouter();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ScriptFilterDto>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadScripts = async () => {
    try {
      setLoading(true);
      const response = await scriptApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        filters,
      });
      setScripts(response.data.data.items);
      setPagination(prev => ({
        ...prev,
        total: response.data.data.meta.total,
        totalPages: response.data.data.meta.totalPages,
      }));
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load scripts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScripts();
  }, [pagination.page, pagination.limit, filters]);

  const handleDuplicate = async (id: string, name: string) => {
    try {
      await scriptApi.duplicate(id, `${name} (Copy)`);
      loadScripts();
      toast({ title: 'Success', description: 'Script duplicated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to duplicate script', variant: 'destructive' });
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await scriptApi.restore(id);
      loadScripts();
      toast({ title: 'Success', description: 'Script restored successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to restore script', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await scriptApi.delete(id);
      loadScripts();
      toast({ title: 'Success', description: 'Script deleted successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete script', variant: 'destructive' });
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value: string, script: Script) => (
        <div className="space-y-1">
          <div className="font-medium">{value}</div>
          {script.description && (
            <div className="text-sm text-muted-foreground line-clamp-2">
              {script.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'language',
      label: 'Language',
      render: (value: ScriptLanguage) => (
        <Badge variant="outline">{languageLabels[value]}</Badge>
      ),
    },
    {
      key: 'version',
      label: 'Version',
      render: (value: string) => (
        <Badge variant="secondary">v{value}</Badge>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: '_count.campaigns',
      label: 'Campaigns',
      render: (value: any, script: Script) => script._count?.campaigns || 0,
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
      render: (value: any, script: Script) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/dashboard/scripts/${script.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/dashboard/scripts/${script.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDuplicate(script.id, script.name)}
          >
            <Copy className="h-4 w-4" />
          </Button>

          {script.deletedAt ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleRestore(script.id)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDelete(script.id)}
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
          <h2 className="text-3xl font-bold tracking-tight">Scripts</h2>
          <p className="text-muted-foreground">Manage calling scripts for your campaigns</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Script
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
            <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
              <DialogTitle>Create New Script</DialogTitle>
            </DialogHeader>
            <CreateScriptForm
              onSuccess={() => {
                setShowCreateDialog(false);
                loadScripts();
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
                placeholder="Search scripts..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.language || 'all'}
              onValueChange={(value) => 
                setFilters({
                  ...filters,
                  language: value === 'all' ? undefined : value as ScriptLanguage,
                })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value={ScriptLanguage.ENGLISH}>English</SelectItem>
                <SelectItem value={ScriptLanguage.HINDI}>Hindi</SelectItem>
                <SelectItem value={ScriptLanguage.MARATHI}>Marathi</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.isActive?.toString() || 'all'}
              onValueChange={(value) => 
                setFilters({
                  ...filters,
                  isActive: value === 'all' ? undefined : value === 'true',
                })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={scripts}
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
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">No scripts found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first script to get started with campaigns
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}