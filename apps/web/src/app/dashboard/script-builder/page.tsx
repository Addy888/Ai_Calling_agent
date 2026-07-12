'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { scriptApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Edit, Copy, Archive } from 'lucide-react';

export default function ScriptBuilderPage() {
  const router = useRouter();
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      setLoading(true);
      const response = await scriptApi.getAll({
        page: 1,
        limit: 50,
      });
      setScripts(response.data.data.items || []);
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScript = () => {
    router.push('/dashboard/scripts/create');
  };

  const handleEditScript = (id: string) => {
    router.push(`/dashboard/script-builder/${id}`);
  };

  const filteredScripts = scripts.filter((script) =>
    script.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Script Builder</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage conversation scripts with visual flow builder
          </p>
        </div>
        <Button onClick={handleCreateScript}>
          <Plus className="mr-2 h-4 w-4" />
          New Script
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading scripts...</p>
        </div>
      ) : filteredScripts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No scripts found</p>
          <Button onClick={handleCreateScript}>Create Your First Script</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScripts.map((script) => (
            <Card key={script.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{script.name}</h3>
                    {script.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {script.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={script.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {script.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Version: {script.version}</span>
                  <span>•</span>
                  <span>{script.language?.toUpperCase() || 'EN'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleEditScript(script.id)}
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/script-builder/${script.id}/preview`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
