'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Shield, Users, Settings, Edit, Trash2, Eye } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: Array<{
    id: string;
    permission: {
      id: string;
      name: string;
      slug: string;
      module: string;
      description?: string;
    };
  }>;
  _count?: {
    users: number;
    permissions: number;
  };
}

interface Permission {
  id: string;
  name: string;
  slug: string;
  module: string;
  description?: string;
}

interface PermissionMatrix {
  role: {
    id: string;
    name: string;
    slug: string;
  };
  permissions: Array<{
    module: string;
    permissions: Array<{
      id: string;
      name: string;
      slug: string;
      description?: string;
      assigned: boolean;
    }>;
  }>;
}

interface RoleFilters {
  search: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix | null>(null);
  const [filters, setFilters] = useState<RoleFilters>({
    search: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { toast } = useToast();

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`/roles?${params.toString()}`);
      
      if (response.data) {
        setRoles(response.data.roles || []);
        setTotal(response.data.total || 0);
        setTotalPages(response.data.totalPages || 0);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch roles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/permissions?limit=1000');
      setPermissions(response.data?.permissions || []);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const fetchPermissionMatrix = async (roleId: string) => {
    try {
      const response = await api.get(`/roles/${roleId}/permission-matrix`);
      setPermissionMatrix(response.data);
    } catch (error) {
      console.error('Failed to fetch permission matrix:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch permission matrix',
        variant: 'destructive',
      });
    }
  };

  const handleCreateRole = async (formData: any) => {
    try {
      await api.post('/roles', formData);
      toast({
        title: 'Success',
        description: 'Role created successfully',
      });
      setShowCreateDialog(false);
      fetchRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create role',
        variant: 'destructive',
      });
    }
  };

  const handleEditRole = async (formData: any) => {
    if (!selectedRole) return;
    
    try {
      await api.patch(`/roles/${selectedRole.id}`, formData);
      toast({
        title: 'Success',
        description: 'Role updated successfully',
      });
      setShowEditDialog(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`)) return;

    try {
      await api.delete(`/roles/${role.id}`);
      toast({
        title: 'Success',
        description: 'Role deleted successfully',
      });
      fetchRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete role',
        variant: 'destructive',
      });
    }
  };

  const handleStatusToggle = async (role: Role) => {
    try {
      const endpoint = role.isActive ? 'deactivate' : 'activate';
      await api.patch(`/roles/${role.id}/${endpoint}`);
      toast({
        title: 'Success',
        description: `Role ${role.isActive ? 'deactivated' : 'activated'} successfully`,
      });
      fetchRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update role status',
        variant: 'destructive',
      });
    }
  };

  const handleAssignPermissions = async (permissionIds: string[]) => {
    if (!selectedRole) return;

    try {
      await api.post(`/roles/${selectedRole.id}/assign-permissions`, { permissionIds });
      toast({
        title: 'Success',
        description: 'Permissions assigned successfully',
      });
      setShowPermissionDialog(false);
      setSelectedRole(null);
      setPermissionMatrix(null);
      fetchRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign permissions',
        variant: 'destructive',
      });
    }
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof RoleFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchRoles();
  }, [currentPage, filters]);

  useEffect(() => {
    fetchPermissions();
  }, []);

  if (loading && roles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Role</DialogTitle>
              <DialogDescription>Add a new role to the system</DialogDescription>
            </DialogHeader>
            <RoleForm 
              permissions={permissions}
              onSubmit={handleCreateRole} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
            <Badge variant="default">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.filter(r => r.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.reduce((sum, role) => sum + (role._count?.users || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search roles..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-full sm:w-48">
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
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Roles ({total})</CardTitle>
          <CardDescription>A list of all roles in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No roles</h3>
              <p className="mt-1 text-sm text-muted-foreground">Get started by creating a new role.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{role.name}</div>
                          <div className="text-sm text-muted-foreground">{role.slug}</div>
                          {role.description && (
                            <div className="text-sm text-muted-foreground mt-1">{role.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {role._count?.permissions || 0} permissions
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {role._count?.users || 0} users
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={role.isActive ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleStatusToggle(role)}
                        >
                          {role.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(role.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async () => {
                              setSelectedRole(role);
                              await fetchPermissionMatrix(role.id);
                              setShowPermissionDialog(true);
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedRole(role);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteRole(role)}
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
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} roles
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update role information</DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <RoleForm 
              role={selectedRole}
              permissions={permissions}
              onSubmit={handleEditRole}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Permission Matrix Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>
              Assign permissions to {selectedRole?.name}
            </DialogDescription>
          </DialogHeader>
          {permissionMatrix && (
            <PermissionMatrixForm 
              matrix={permissionMatrix}
              onSubmit={handleAssignPermissions}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RoleFormProps {
  role?: Role;
  permissions: Permission[];
  onSubmit: (formData: any) => void;
}

function RoleForm({ role, permissions, onSubmit }: RoleFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role?.permissions.map(p => p.permission.id) || []
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      description: formData.get('description') as string,
      permissionIds: selectedPermissions,
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

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Role Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={role?.name || ''}
          placeholder="Enter role name"
          onChange={(e) => {
            if (!role) {
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
        <Label htmlFor="slug">Role Slug</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={role?.slug || ''}
          placeholder="role-slug"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={role?.description || ''}
          placeholder="Enter role description"
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label>Permissions ({selectedPermissions.length} selected)</Label>
        <div className="max-h-64 overflow-y-auto border rounded-md p-4 space-y-3">
          {Object.entries(
            permissions.reduce((acc, permission) => {
              if (!acc[permission.module]) acc[permission.module] = [];
              acc[permission.module].push(permission);
              return acc;
            }, {} as Record<string, Permission[]>)
          ).map(([module, modulePermissions]) => (
            <div key={module} className="space-y-2">
              <h4 className="font-medium text-sm capitalize">{module}</h4>
              <div className="space-y-2 pl-4">
                {modulePermissions.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission.id}
                      checked={selectedPermissions.includes(permission.id)}
                      onCheckedChange={() => togglePermission(permission.id)}
                    />
                    <Label htmlFor={permission.id} className="text-sm">
                      {permission.name}
                      {permission.description && (
                        <span className="text-muted-foreground"> - {permission.description}</span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading && <Spinner className="mr-2 h-4 w-4" />}
          {role ? 'Update' : 'Create'} Role
        </Button>
      </div>
    </form>
  );
}

interface PermissionMatrixFormProps {
  matrix: PermissionMatrix;
  onSubmit: (permissionIds: string[]) => void;
}

function PermissionMatrixForm({ matrix, onSubmit }: PermissionMatrixFormProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    matrix.permissions.flatMap(module => 
      module.permissions.filter(p => p.assigned).map(p => p.id)
    )
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(selectedPermissions);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleModule = (modulePermissions: any[]) => {
    const modulePermissionIds = modulePermissions.map(p => p.id);
    const allSelected = modulePermissionIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !modulePermissionIds.includes(id)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...modulePermissionIds])]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        {matrix.permissions.map((module) => {
          const modulePermissionIds = module.permissions.map(p => p.id);
          const allSelected = modulePermissionIds.every(id => selectedPermissions.includes(id));
          const someSelected = modulePermissionIds.some(id => selectedPermissions.includes(id));
          
          return (
            <div key={module.module} className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      const inputEl = el.querySelector('input') as HTMLInputElement;
                      if (inputEl) inputEl.indeterminate = someSelected && !allSelected;
                    }
                  }}
                  onCheckedChange={() => toggleModule(module.permissions)}
                />
                <h4 className="font-medium capitalize">{module.module}</h4>
                <Badge variant="outline" className="text-xs">
                  {module.permissions.filter(p => selectedPermissions.includes(p.id)).length}/{module.permissions.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                {module.permissions.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission.id}
                      checked={selectedPermissions.includes(permission.id)}
                      onCheckedChange={() => togglePermission(permission.id)}
                    />
                    <Label htmlFor={permission.id} className="text-sm flex-1">
                      <div>{permission.name}</div>
                      {permission.description && (
                        <div className="text-xs text-muted-foreground">{permission.description}</div>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {selectedPermissions.length} permissions selected
        </div>
        <Button type="submit" disabled={loading}>
          {loading && <Spinner className="mr-2 h-4 w-4" />}
          Update Permissions
        </Button>
      </div>
    </form>
  );
}