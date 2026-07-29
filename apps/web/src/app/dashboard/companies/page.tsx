'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Upload, Eye, Edit, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Pagination } from '@/components/ui/pagination';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';

interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    campaigns: number;
    contacts: number;
  };
}

interface CompanyFilters {
  search: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [filters, setFilters] = useState<CompanyFilters>({
    search: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { toast } = useToast();

  const fetchCompanies = async () => {
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

      const response = await api.get(`/companies?${params.toString()}`);
      
      if (response.data?.success && response.data?.data) {
        setCompanies(response.data.data.items || []);
        setTotal(response.data.data.meta?.totalItems || 0);
        setTotalPages(response.data.data.meta?.totalPages || 0);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch companies',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (formData: any) => {
    try {
      await api.post('/companies', formData);
      toast({
        title: 'Success',
        description: 'Company and administrator created successfully. Admin can now log in.',
      });
      setShowCreateDialog(false);
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create company',
        variant: 'destructive',
      });
    }
  };

  const handleEditCompany = async (formData: any) => {
    if (!selectedCompany) return;
    
    try {
      // For edit, only send company fields (no administrator)
      const { administrator, ...companyData } = formData;
      await api.patch(`/companies/${selectedCompany.id}`, companyData);
      toast({
        title: 'Success',
        description: 'Company updated successfully',
      });
      setShowEditDialog(false);
      setSelectedCompany(null);
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update company',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Are you sure you want to delete ${company.name}?`)) return;

    try {
      await api.delete(`/companies/${company.id}`);
      toast({
        title: 'Success',
        description: 'Company deleted successfully',
      });
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete company',
        variant: 'destructive',
      });
    }
  };

  const handleStatusToggle = async (company: Company) => {
    try {
      const endpoint = company.isActive ? 'deactivate' : 'activate';
      await api.patch(`/companies/${company.id}/${endpoint}`);
      toast({
        title: 'Success',
        description: `Company ${company.isActive ? 'deactivated' : 'activated'} successfully`,
      });
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update company status',
        variant: 'destructive',
      });
    }
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof CompanyFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchCompanies();
  }, [currentPage, filters]);

  if (loading && companies.length === 0) {
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
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">Manage your companies and organizations</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Company</DialogTitle>
              <DialogDescription>Add a new company with administrator account</DialogDescription>
            </DialogHeader>
            <CompanyForm onSubmit={handleCreateCompany} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Badge variant="default">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.filter(c => c.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Badge variant="secondary">Inactive</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.filter(c => !c.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.filter(c => {
                const createdAt = new Date(c.createdAt);
                const thisMonth = new Date();
                return createdAt.getMonth() === thisMonth.getMonth() && 
                       createdAt.getFullYear() === thisMonth.getFullYear();
              }).length}
            </div>
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
                  placeholder="Search companies..."
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

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Companies ({total})</CardTitle>
          <CardDescription>A list of all companies in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No companies</h3>
              <p className="mt-1 text-sm text-muted-foreground">Get started by creating a new company.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            {company.logo ? (
                              <AvatarImage src={`/api/files/${company.logo}`} alt={company.name} />
                            ) : null}
                            <AvatarFallback>
                              {company.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{company.name}</div>
                            <div className="text-sm text-muted-foreground">{company.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{company.email}</div>
                          {company.phone && (
                            <div className="text-muted-foreground">{company.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.website ? (
                          <a 
                            href={company.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {company.website}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {company._count?.users || 0} users
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={company.isActive ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleStatusToggle(company)}
                        >
                          {company.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(company.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedCompany(company);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteCompany(company)}
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
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} companies
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
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company information</DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <CompanyForm 
              company={selectedCompany} 
              onSubmit={handleEditCompany}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CompanyFormProps {
  company?: Company;
  onSubmit: (formData: any) => void;
}

function CompanyForm({ company, onSubmit }: CompanyFormProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    // Company Information
    name: company?.name || '',
    email: company?.email || '',
    phone: company?.phone || '',
    website: company?.website || '',
    address: '',
    status: company?.status || 'ACTIVE',
    subscriptionPlan: 'BASIC',
    
    // Administrator (only for new companies)
    administrator: {
      fullName: '',
      adminEmail: '',
      password: '',
      confirmPassword: '',
      forcePasswordChange: true,
      sendWelcomeEmail: true,
    }
  });

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('administrator.')) {
      const adminField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        administrator: {
          ...prev.administrator,
          [adminField]: value,
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateForm = () => {
    // Validate company fields
    if (!formData.name || formData.name.length < 2) {
      return 'Company name must be at least 2 characters';
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Valid company email is required';
    }

    // Validate administrator (only for new companies)
    if (!company) {
      if (!formData.administrator.fullName || formData.administrator.fullName.length < 2) {
        return 'Administrator full name is required';
      }
      if (!formData.administrator.adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.administrator.adminEmail)) {
        return 'Valid administrator email is required';
      }
      if (!formData.administrator.password || formData.administrator.password.length < 8) {
        return 'Password must be at least 8 characters';
      }
      if (formData.administrator.password !== formData.administrator.confirmPassword) {
        return 'Passwords do not match';
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const error = validateForm();
    if (error) {
      toast({
        title: 'Validation Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Company Information */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold">Company Information</h3>
          <p className="text-sm text-muted-foreground">Enter the company details</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Company Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter company name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Company Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="contact@company.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+1-555-0123"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="https://company.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Enter company address"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
            <Select value={formData.subscriptionPlan} onValueChange={(value) => handleChange('subscriptionPlan', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BASIC">Basic</SelectItem>
                <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Section 2: Company Administrator (only for new companies) */}
      {!company && (
        <div className="space-y-4">
          <div className="border-b pb-2">
            <h3 className="text-lg font-semibold">Company Administrator</h3>
            <p className="text-sm text-muted-foreground">Create the admin account for this company</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Admin Full Name *</Label>
            <Input
              id="fullName"
              value={formData.administrator.fullName}
              onChange={(e) => handleChange('administrator.fullName', e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin Email *</Label>
            <Input
              id="adminEmail"
              type="email"
              value={formData.administrator.adminEmail}
              onChange={(e) => handleChange('administrator.adminEmail', e.target.value)}
              placeholder="admin@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.administrator.password}
                onChange={(e) => handleChange('administrator.password', e.target.value)}
                placeholder="Minimum 8 characters"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Must be at least 8 characters long</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={formData.administrator.confirmPassword}
              onChange={(e) => handleChange('administrator.confirmPassword', e.target.value)}
              placeholder="Re-enter password"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="forcePasswordChange"
                checked={formData.administrator.forcePasswordChange}
                onChange={(e) => handleChange('administrator.forcePasswordChange', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="forcePasswordChange" className="text-sm font-normal cursor-pointer">
                Force password change on first login
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sendWelcomeEmail"
                checked={formData.administrator.sendWelcomeEmail}
                onChange={(e) => handleChange('administrator.sendWelcomeEmail', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="sendWelcomeEmail" className="text-sm font-normal cursor-pointer">
                Send welcome email to administrator
              </Label>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="submit" disabled={loading}>
          {loading && <Spinner className="mr-2 h-4 w-4" />}
          {company ? 'Update Company' : 'Create Company & Administrator'}
        </Button>
      </div>
    </form>
  );
}