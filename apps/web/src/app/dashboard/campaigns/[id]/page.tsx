'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { DataTable } from '@/components/ui/data-table';
import { 
  Edit, 
  Play, 
  Pause, 
  Copy, 
  Archive, 
  RotateCcw, 
  Users, 
  Phone, 
  FileText, 
  MessageSquare,
  Calendar,
  BarChart3
} from 'lucide-react';
import { campaignApi } from '@/lib/api';
import { Campaign, CampaignStatus, Contact } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { toast } from '@/components/ui/toast';

const statusColors: Record<CampaignStatus, string> = {
  [CampaignStatus.DRAFT]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  [CampaignStatus.SCHEDULED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [CampaignStatus.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [CampaignStatus.PAUSED]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [CampaignStatus.COMPLETED]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  [CampaignStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function CampaignDetailsPage() {
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
      toast.error('Failed to load campaign details');
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

  const handleStatusUpdate = async (status: CampaignStatus) => {
    try {
      await campaignApi.updateStatus(campaignId, status);
      loadCampaign();
      toast.success('Campaign status updated successfully');
    } catch (error) {
      toast.error('Failed to update campaign status');
    }
  };

  const handleClone = async () => {
    try {
      await campaignApi.clone(campaignId, `${campaign?.name} (Copy)`);
      toast.success('Campaign cloned successfully');
      router.push('/dashboard/campaigns');
    } catch (error) {
      toast.error('Failed to clone campaign');
    }
  };

  const handleArchive = async () => {
    try {
      await campaignApi.archive(campaignId);
      toast.success('Campaign archived successfully');
      router.push('/dashboard/campaigns');
    } catch (error) {
      toast.error('Failed to archive campaign');
    }
  };

  const handleRestore = async () => {
    try {
      await campaignApi.restore(campaignId);
      loadCampaign();
      toast.success('Campaign restored successfully');
    } catch (error) {
      toast.error('Failed to restore campaign');
    }
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

  const contactColumns = [
    {
      key: 'fullName',
      label: 'Name',
      render: (value: string, contact: Contact) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{contact.phone}</div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (value: string) => value || 'Not provided',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant="secondary">{value}</Badge>
      ),
    },
    {
      key: 'lastCalledAt',
      label: 'Last Called',
      render: (value: string) => value ? formatDateTime(value) : 'Never',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">{campaign.name}</h2>
            <Badge variant="secondary" className={statusColors[campaign.status]}>
              {campaign.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{campaign.description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {campaign.status === CampaignStatus.ACTIVE && (
            <Button
              variant="outline"
              onClick={() => handleStatusUpdate(CampaignStatus.PAUSED)}
            >
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
          
          {campaign.status === CampaignStatus.PAUSED && (
            <Button
              variant="outline"
              onClick={() => handleStatusUpdate(CampaignStatus.ACTIVE)}
            >
              <Play className="mr-2 h-4 w-4" />
              Resume
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/campaigns/${campaignId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <Button variant="outline" onClick={handleClone}>
            <Copy className="mr-2 h-4 w-4" />
            Clone
          </Button>

          {campaign.deletedAt ? (
            <Button variant="outline" onClick={handleRestore}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </Button>
          ) : (
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign._count?.contacts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign._count?.calls || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.statistics?.calls.total ? 
                Math.round((campaign.statistics.calls.byStatus.COMPLETED / campaign.statistics.calls.total) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(campaign.createdAt)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant="secondary" className={statusColors[campaign.status]}>
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                  <div className="mt-1 text-sm">
                    {campaign.startDate ? formatDateTime(campaign.startDate) : 'Not set'}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">End Date</label>
                  <div className="mt-1 text-sm">
                    {campaign.endDate ? formatDateTime(campaign.endDate) : 'Not set'}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timezone</label>
                  <div className="mt-1 text-sm">{campaign.timezone || 'Not set'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assigned Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Script</label>
                  <div className="mt-1 text-sm">
                    {campaign.script ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {campaign.script.name} (v{campaign.script.version})
                      </div>
                    ) : (
                      'No script assigned'
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Prompt</label>
                  <div className="mt-1 text-sm">
                    {campaign.prompt ? (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {campaign.prompt.name} (v{campaign.prompt.version})
                      </div>
                    ) : (
                      'No prompt assigned'
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {campaign.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{campaign.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Contacts ({campaign._count?.contacts || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={campaign.contacts || []}
                columns={contactColumns}
                emptyState={
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold text-foreground">No contacts assigned</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Assign contacts to this campaign to start calling
                    </p>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="script">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Script</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.script ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{campaign.script.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Version {campaign.script.version} • Language: {campaign.script.language}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/dashboard/scripts/${campaign.script?.id}`)}
                    >
                      View Script
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <pre className="whitespace-pre-wrap text-sm">{campaign.script.content}</pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold text-foreground">No script assigned</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Assign a script to provide guidance for your agents
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt">
          <Card>
            <CardHeader>
              <CardTitle>AI Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.prompt ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{campaign.prompt.name}</h3>
                      <p className="text-sm text-muted-foreground">Version {campaign.prompt.version}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/dashboard/prompts/${campaign.prompt?.id}`)}
                    >
                      View Prompt
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <pre className="whitespace-pre-wrap text-sm">{campaign.prompt.content}</pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold text-foreground">No prompt assigned</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Assign an AI prompt to guide automated conversations
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                {campaign.statistics?.contacts ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total</span>
                      <span className="font-medium">{campaign.statistics.contacts.total}</span>
                    </div>
                    {Object.entries(campaign.statistics.contacts.byStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span className="text-sm">{status}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No contact statistics available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Call Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                {campaign.statistics?.calls ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total</span>
                      <span className="font-medium">{campaign.statistics.calls.total}</span>
                    </div>
                    {Object.entries(campaign.statistics.calls.byStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span className="text-sm">{status}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No call statistics available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}