'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft } from 'lucide-react';
import { scriptApi } from '@/lib/api';
import { Script } from '@/types';
import { toast } from '@/components/ui/toast';
import { EditScriptForm } from './edit-script-form';

export default function EditScriptPage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params.id as string;
  
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);

  const loadScript = async () => {
    try {
      setLoading(true);
      const response = await scriptApi.getById(scriptId);
      setScript(response.data.data);
    } catch (error) {
      toast.error('Failed to load script details');
      router.push('/dashboard/scripts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scriptId) {
      loadScript();
    }
  }, [scriptId]);

  const handleSuccess = () => {
    router.push(`/dashboard/scripts/${scriptId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Script not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Script</h2>
          <p className="text-muted-foreground">Update script content and settings</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Script Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <EditScriptForm script={script} onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}