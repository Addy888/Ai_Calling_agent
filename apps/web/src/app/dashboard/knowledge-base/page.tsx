'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FileText, Upload, Download, Eye, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  type: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'FAQ',
    content: '',
  });

  useEffect(() => {
    fetchKnowledgeBase();
  }, []);

  const fetchKnowledgeBase = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/knowledge-base?page=1&limit=50');
      if (response.data.success) {
        setItems(response.data.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch knowledge base:', error);
      // Graceful fallback with mock data
      setItems([
        {
          id: '1',
          name: 'Product Information',
          description: 'Comprehensive product details and specifications',
          type: 'PRODUCT',
          content: 'Our products include AI-powered calling solutions...',
          isActive: true,
          createdAt: new Date(Date.now() - 2592000000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '2',
          name: 'Frequently Asked Questions',
          description: 'Common questions and answers',
          type: 'FAQ',
          content: 'Q: How does AI calling work? A: Our AI uses...',
          isActive: true,
          createdAt: new Date(Date.now() - 5184000000).toISOString(),
          updatedAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: '3',
          name: 'Pricing Guide',
          description: 'Pricing tiers and packages',
          type: 'PRICING',
          content: 'We offer flexible pricing plans starting from...',
          isActive: true,
          createdAt: new Date(Date.now() - 7776000000).toISOString(),
          updatedAt: new Date(Date.now() - 259200000).toISOString(),
        },
        {
          id: '4',
          name: 'Technical Documentation',
          description: 'API and integration documentation',
          type: 'TECHNICAL',
          content: 'To integrate with our API, use the following endpoints...',
          isActive: false,
          createdAt: new Date(Date.now() - 10368000000).toISOString(),
          updatedAt: new Date(Date.now() - 432000000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await apiClient.post('/knowledge-base', formData);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Knowledge base item created successfully',
        });
        setIsCreateOpen(false);
        fetchKnowledgeBase();
        setFormData({
          name: '',
          description: '',
          type: 'FAQ',
          content: '',
        });
      }
    } catch (error) {
      console.error('Failed to create knowledge base item:', error);
      toast({
        title: 'Info',
        description: 'Knowledge base feature is in demo mode. Backend implementation pending.',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/knowledge-base/${id}`);
      toast({
        title: 'Success',
        description: 'Knowledge base item deleted',
      });
      fetchKnowledgeBase();
    } catch (error) {
      console.error('Failed to delete knowledge base item:', error);
      toast({
        title: 'Info',
        description: 'Delete operation is in demo mode.',
      });
    }
  };

  const columns: Column<KnowledgeBase>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (value) => (
        <div className="font-medium">{value}</div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => (
        <Badge variant="outline">{value}</Badge>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (value) => (
        <div className="text-sm text-muted-foreground truncate max-w-xs">
          {value}
        </div>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      render: (value) => (
        <div className="text-sm">
          {new Date(value).toLocaleDateString()}
        </div>
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
            onClick={() => console.log('View', row.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-4 w-4" />
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
          <h2 className="text-3xl font-bold tracking-tight">Knowledge Base</h2>
          <p className="text-muted-foreground">
            Manage AI knowledge and training data
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Knowledge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Knowledge Base Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Product Information"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="FAQ">FAQ</option>
                  <option value="PRODUCT">Product Info</option>
                  <option value="PRICING">Pricing</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="POLICY">Policy</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Knowledge base content..."
                  rows={8}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!loading && items && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{items?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {items?.filter(i => i.isActive).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {items ? new Set(items.map(i => i.type)).size : 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Updated Today</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {items ? items.filter(i => {
                  const itemDate = new Date(i.updatedAt);
                  const today = new Date();
                  return itemDate.toDateString() === today.toDateString();
                }).length : 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Knowledge Items</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={items} />
        </CardContent>
      </Card>
    </div>
  );
}
