'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft } from 'lucide-react';
import { promptApi } from '@/lib/api';
import { Prompt } from '@/types';
import { toast } from '@/components/ui/toast';
import { EditPromptForm } from './edit-prompt-form';

export default function EditPromptPage() {
  const params = useParams();
  const router = useRouter();
  const promptId = params.id as string;
  
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPrompt = async () => {
    try {
      setLoading(true);
      const response = await promptApi.getById(promptId);
      setPrompt(response.data.data);
    } catch (error) {
      toast.error('Failed to load prompt details');
      router.push('/dashboard/prompts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (promptId) {
      loadPrompt();
    }
  }, [promptId]);

  const handleSuccess = () => {
    router.push(`/dashboard/prompts/${promptId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Prompt not found</p>
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
          <h2 className="text-3xl font-bold tracking-tight">Edit AI Prompt</h2>
          <p className="text-muted-foreground">Update prompt content and settings</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompt Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <EditPromptForm prompt={prompt} onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}