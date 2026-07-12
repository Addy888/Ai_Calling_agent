'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Settings, Shield, Edit, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Pagination } from '@/components/ui/pagination';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

interface Permission {
  id: string;
  name: string;
  slug: string;
  module: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    roles: number;
  };
}

interface PermissionFilters {
  search: string;
  module: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [filters, setFilters] = useState<PermissionFilters>({
    search: '',
    module: '',
    status: '',
    sortBy: 'module',
    sortOrder: 'asc',
  });

  const { toast } = useToast();

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.module) params.append('module', filters.module);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`/permissions?${params.toString()}`);
      
      if (response.data) {
        setPermissions(response.data.permissions || []);
        setTotal(response.data.total || 0);
        setTotalPages(response.data.totalPages || 0);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch permissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const response = await api.get('/permissions/modules');
      setModules(response.data || []);
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    }
  };

  const seedDefaultPermissions = async () => {
    try {
      await api.post('/permissions/seed');
      toast({
        title: 'Success',
        description: 'Default permissions seeded successfully',
      });
      fetchPermissions();
      fetchModules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to seed permissions',
        variant: 'destructive',
      });
    }
  };

  const handleCreatePermission = async (formData: any) => {
    try {
      await api.post('/permissions', formData);
      toast({
        title: 'Success',
        description: 'Permission created successfully',
      });
      setShowCreateDialog(false);
      fetchPermissions();
      fetchModules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create permission',
        variant: 'destructive',
      });
    }
  };

  const handleEditPermission = async (formData: any) => {
    if (!selectedPermission) return;
    
    try {
      await api.patch(`/permissions/${selectedPermission.id}`, formData);
      toast({
        title: 'Success',
        description: 'Permission updated successfully',
      });
      setShowEditDialog(false);
      setSelectedPermission(null);
      fetchPermissions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update permission',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePermission = async (permission: Permission) => {
    if (!confirm(`Are you sure you want to delete the permission "${permission.name}"? This action cannot be undone.`)) return;

    try {
      await api.delete(`/permissions/${permission.id}`);
      toast({
        title: 'Success',
        description: 'Permission deleted successfully',
      });
      fetchPermissions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete permission',
        variant: 'destructive',
      });
    }
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof PermissionFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchPermissions();
  }, [currentPage, filters]);

  useEffect(() => {
    fetchModules();
  }, []);

  if (loading && permissions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // Group permissions by module for better visualization
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissions</h1>
          <p className="text-muted-foreground">Manage system permissions and access controls</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={seedDefaultPermissions}>
            <Settings className="mr-2 h-4 w-4" />
            Seed Defaults
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Permission
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Permission</DialogTitle>
                <DialogDescription>Add a new permission to the system</DialogDescription>
              </DialogHeader>
              <PermissionForm 
                modules={modules}
                onSubmit={handleCreatePermission} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Badge variant="default">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {permissions.filter(p => p.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {permissions.filter(p => (p._count?.roles || 0) > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search permissions..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filters.module} onValueChange={(value) => handleFilterChange('module', value)}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Modules</SelectItem>
                {modules.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module.charAt(0).toUpperCase() + module.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={`${filters.sortBy}-${filters.sortOrder}`} 
              onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split('-') as [string, 'asc' | 'desc'];
                setFilters(prev => ({ ...prev, sortBy, sortOrder }));
              }}
            >
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="module-asc">Module A-Z</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Display */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : permissions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No permissions</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by creating permissions or seeding default permissions.
            </p>
            <div className="mt-4 space-x-2">
              <Button onClick={seedDefaultPermissions}>
                <Settings className="mr-2 h-4 w-4" />
                Seed Default Permissions
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filters.module ? (
        // Show filtered results in table format
        <Card>
          <CardHeader>
            <CardTitle>
              {filters.module.charAt(0).toUpperCase() + filters.module.slice(1)} Permissions ({total})
            </CardTitle>
            <CardDescription>Permissions for the {filters.module} module</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{permission.name}</div>
                        {permission.description && (
                          <div className="text-sm text-muted-foreground">{permission.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{permission.slug}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {permission._count?.roles || 0} roles
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={permission.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {permission.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(permission.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedPermission(permission);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeletePermission(permission)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} permissions
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        // Show grouped by modules
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
            <Card key={module}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="capitalize">{module} Module</span>
                  <Badge variant="outline">{modulePermissions.length} permissions</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {modulePermissions.map((permission) => (
                    <Card key={permission.id} className="border-2 hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{permission.name}</h4>
                            <code className="text-xs text-muted-foreground">{permission.slug}</code>
                            {permission.description && (
                              <p className="text-sm text-muted-foreground mt-1">{permission.description}</p>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge 
                                variant={permission.status === 'ACTIVE' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {permission.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {permission._count?.roles || 0} roles
                              </Badge>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedPermission(permission);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeletePermission(permission)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination for grouped view */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} permissions
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
            <DialogDescription>Update permission information</DialogDescription>
          </DialogHeader>
          {selectedPermission && (
            <PermissionForm 
              permission={selectedPermission}
              modules={modules}
              onSubmit={handleEditPermission}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PermissionFormProps {
  permission?: Permission;
  modules: string[];
  onSubmit: (formData: any) => void;
}

function PermissionForm({ permission, modules, onSubmit }: PermissionFormProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      module: formData.get('module') as string,
      description: formData.get('description') as string,
    };
    
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Permission Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={permission?.name || ''}
          placeholder="Enter permission name"
          onChange={(e) => {
            if (!permission) {
              const slugInput = document.getElementById('slug') as HTMLInputElement;
              if (slugInput) {
                slugInput.value = generateSlug(e.target.value);
              }
            }
          }}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Permission Slug</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={permission?.slug || ''}
          placeholder="permission-slug"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="module">Module</Label>
        <Select name="module" defaultValue={permission?.module || ''} required>
          <SelectTrigger>
            <SelectValue placeholder="Select module" />
          </SelectTrigger>
          <SelectContent>
            {modules.map((module) => (
              <SelectItem key={module} value={module}>
                {module.charAt(0).toUpperCase() + module.slice(1)}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom Module</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={permission?.description || ''}
          placeholder="Enter permission description"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading && <Spinner className="mr-2 h-4 w-4" />}
          {permission ? 'Update' : 'Create'} Permission
        </Button>
      </div>
    </form>
  );
}