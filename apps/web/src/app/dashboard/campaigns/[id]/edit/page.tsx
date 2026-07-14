'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft } from 'lucide-react';
import { campaignApi } from '@/lib/api';
import { Campaign } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { EditCampaignForm } from './edit-campaign-form';

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const response = await campaignApi.getById(campaignId);
      setCampaign(response.data.data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load campaign details', variant: 'destructive' });
      router.push('/dashboard/campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId]);

  const handleSuccess = () => {
    router.push(`/dashboard/campaigns/${campaignId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Campaign not found</p>
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
          <h2 className="text-3xl font-bold tracking-tight">Edit Campaign</h2>
          <p className="text-muted-foreground">Update campaign details and settings</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Information</CardTitle>
        </CardHeader>
        <CardContent>
          <EditCampaignForm campaign={campaign} onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}