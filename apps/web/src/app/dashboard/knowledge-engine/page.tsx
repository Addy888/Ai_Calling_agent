'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  FileCheck,
  AlertCircle,
  Clock,
  Database,
  BookOpen,
  TrendingUp,
} from 'lucide-react';

interface KnowledgeStats {
  documents: {
    total: number;
    active: number;
    pendingProcessing: number;
    completedProcessing: number;
  };
  chunks: {
    total: number;
  };
  searches: {
    total: number;
  };
}

interface Document {
  id: string;
  name: string;
  fileType: string;
  category: string;
  status: string;
  processingStatus: string;
  fileSize: number;
  createdAt: string;
  _count?: {
    chunks: number;
  };
}

export default function KnowledgeEnginePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedCategory, selectedFileType, selectedStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const companyId = localStorage.getItem('companyId') || 'demo-company-1';
      
      const statsResponse = await fetch(`/api/knowledge/statistics?companyId=${companyId}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        setStats({
          documents: { total: 0, active: 0, pendingProcessing: 0, completedProcessing: 0 },
          chunks: { total: 0 },
          searches: { total: 0 },
        });
      }

      const params = new URLSearchParams({ companyId });
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedFileType) params.append('fileType', selectedFileType);
      if (selectedStatus) params.append('status', selectedStatus);

      const docsResponse = await fetch(`/api/knowledge/documents?${params}`);
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setDocuments(docsData.data || []);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching knowledge data:', error);
      setStats({
        documents: { total: 0, active: 0, pendingProcessing: 0, completedProcessing: 0 },
        chunks: { total: 0 },
        searches: { total: 0 },
      });
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-500';
      case 'PENDING':
        return 'bg-yellow-500';
      case 'PROCESSING':
        return 'bg-blue-500';
      case 'FAILED':
        return 'bg-red-500';
      case 'ARCHIVED':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toUpperCase()) {
      case 'PDF':
        return '📄';
      case 'DOCX':
        return '📝';
      case 'TXT':
        return '📃';
      case 'CSV':
        return '📊';
      case 'MARKDOWN':
        return '📋';
      case 'JSON':
        return '🔧';
      default:
        return '📄';
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enterprise Knowledge Engine</h1>
          <p className="text-gray-600 mt-1">
            Process, index, and search company knowledge
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {!loading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-3xl font-bold mt-2">{stats.documents.total}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.documents.active} active
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Chunks</p>
                <p className="text-3xl font-bold mt-2">{stats.chunks.total}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Searchable pieces
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Database className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-3xl font-bold mt-2">
                  {stats.documents.pendingProcessing}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.documents.completedProcessing} completed
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Searches</p>
                <p className="text-3xl font-bold mt-2">{stats.searches.total}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Knowledge queries
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Document Manager</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              className="border rounded-md px-3 py-2"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="FAQ">FAQ</option>
              <option value="POLICY">Policy</option>
              <option value="PRICING">Pricing</option>
              <option value="DOCUMENTATION">Documentation</option>
            </select>
            <select
              className="border rounded-md px-3 py-2"
              value={selectedFileType}
              onChange={(e) => setSelectedFileType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="PDF">PDF</option>
              <option value="DOCX">DOCX</option>
              <option value="TXT">TXT</option>
              <option value="CSV">CSV</option>
              <option value="MARKDOWN">Markdown</option>
              <option value="JSON">JSON</option>
            </select>
            <select
              className="border rounded-md px-3 py-2"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">Document</th>
                  <th className="text-left p-4 font-medium text-gray-600">Type</th>
                  <th className="text-left p-4 font-medium text-gray-600">Category</th>
                  <th className="text-left p-4 font-medium text-gray-600">Status</th>
                  <th className="text-left p-4 font-medium text-gray-600">Processing</th>
                  <th className="text-left p-4 font-medium text-gray-600">Chunks</th>
                  <th className="text-left p-4 font-medium text-gray-600">Size</th>
                  <th className="text-left p-4 font-medium text-gray-600">Date</th>
                  <th className="text-left p-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center p-8 text-gray-500">
                      Loading documents...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center p-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No documents found</p>
                      <p className="text-sm mt-1">Upload your first document to get started</p>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="border-t hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileTypeIcon(doc.fileType)}</span>
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-gray-500">{doc.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{doc.fileType}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{doc.category || 'None'}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(doc.status)}`} />
                          <span className="text-sm">{doc.status}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {doc.processingStatus === 'COMPLETED' && (
                            <FileCheck className="h-4 w-4 text-green-600" />
                          )}
                          {doc.processingStatus === 'PROCESSING' && (
                            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                          )}
                          {doc.processingStatus === 'FAILED' && (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">{doc.processingStatus}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{doc._count?.chunks || 0}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{formatFileSize(Number(doc.fileSize))}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Search className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Search Console</h2>
          <div className="space-y-4">
            <div>
              <Input placeholder="Enter search query..." className="w-full" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Keyword Search
              </Button>
              <Button variant="outline" className="flex-1">
                <BookOpen className="h-4 w-4 mr-2" />
                Semantic Search
              </Button>
              <Button variant="outline" className="flex-1">
                <Database className="h-4 w-4 mr-2" />
                Hybrid Search
              </Button>
            </div>
            <div className="border rounded-lg p-4 min-h-[200px] bg-gray-50">
              <p className="text-sm text-gray-500 text-center mt-8">
                Search results will appear here
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Processing Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Completed</p>
                  <p className="text-sm text-gray-500">Ready for search</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {stats?.documents.completedProcessing || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                </div>
                <div>
                  <p className="font-medium">Processing</p>
                  <p className="text-sm text-gray-500">Currently analyzing</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {stats?.documents.pendingProcessing || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">Total Chunks</p>
                  <p className="text-sm text-gray-500">Searchable pieces</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-600">
                {stats?.chunks.total || 0}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
