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
import { Plus, Mic, Play, Trash2, Upload } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';

interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  provider: string;
  voiceId: string;
  language: string;
  gender: string;
  isActive: boolean;
  createdAt: string;
}

export default function VoiceLibraryPage() {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: 'OPENAI',
    voiceId: '',
    language: 'en-US',
    gender: 'FEMALE',
  });

  useEffect(() => {
    fetchVoiceProfiles();
  }, []);

  const fetchVoiceProfiles = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/voice-profiles?page=1&limit=50');
      if (response.data.success) {
        setVoices(response.data.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch voice profiles:', error);
      // Graceful fallback with mock data
      setVoices([
        {
          id: '1',
          name: 'Emma - Professional',
          description: 'Professional female voice for business calls',
          provider: 'OPENAI',
          voiceId: 'nova',
          language: 'en-US',
          gender: 'FEMALE',
          isActive: true,
          createdAt: new Date(Date.now() - 2592000000).toISOString(),
        },
        {
          id: '2',
          name: 'James - Friendly',
          description: 'Warm and friendly male voice',
          provider: 'ELEVENLABS',
          voiceId: 'james_v1',
          language: 'en-US',
          gender: 'MALE',
          isActive: true,
          createdAt: new Date(Date.now() - 5184000000).toISOString(),
        },
        {
          id: '3',
          name: 'Sofia - Multilingual',
          description: 'Supports English and Spanish',
          provider: 'GOOGLE',
          voiceId: 'sofia_neural',
          language: 'es-US',
          gender: 'FEMALE',
          isActive: true,
          createdAt: new Date(Date.now() - 7776000000).toISOString(),
        },
        {
          id: '4',
          name: 'David - Executive',
          description: 'Deep professional voice for executives',
          provider: 'OPENAI',
          voiceId: 'onyx',
          language: 'en-US',
          gender: 'MALE',
          isActive: false,
          createdAt: new Date(Date.now() - 10368000000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await apiClient.post('/voice-profiles', formData);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Voice profile created successfully',
        });
        setIsCreateOpen(false);
        fetchVoiceProfiles();
        setFormData({
          name: '',
          description: '',
          provider: 'OPENAI',
          voiceId: '',
          language: 'en-US',
          gender: 'FEMALE',
        });
      }
    } catch (error) {
      console.error('Failed to create voice profile:', error);
      toast({
        title: 'Info',
        description: 'Voice library feature is in demo mode. Backend implementation pending.',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/voice-profiles/${id}`);
      toast({
        title: 'Success',
        description: 'Voice profile deleted',
      });
      fetchVoiceProfiles();
    } catch (error) {
      console.error('Failed to delete voice profile:', error);
      toast({
        title: 'Info',
        description: 'Delete operation is in demo mode.',
      });
    }
  };

  const columns: Column<VoiceProfile>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (value) => (
        <div className="font-medium">{value}</div>
      ),
    },
    {
      key: 'provider',
      label: 'Provider',
      render: (value) => (
        <Badge variant="outline">{value}</Badge>
      ),
    },
    {
      key: 'language',
      label: 'Language',
      render: (value) => (
        <span className="text-sm">{value}</span>
      ),
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (value) => (
        <Badge variant="secondary">{value}</Badge>
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
      key: 'id',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => console.log('Play preview', row.id)}
          >
            <Play className="h-4 w-4" />
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
          <h2 className="text-3xl font-bold tracking-tight">Voice Library</h2>
          <p className="text-muted-foreground">
            Manage AI voice profiles and TTS settings
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Voice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Voice Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Voice Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Emma - Professional"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Voice description"
                />
              </div>
              <div>
                <Label htmlFor="provider">Provider</Label>
                <select
                  id="provider"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="OPENAI">OpenAI</option>
                  <option value="ELEVENLABS">ElevenLabs</option>
                  <option value="GOOGLE">Google</option>
                  <option value="AMAZON">Amazon Polly</option>
                  <option value="MICROSOFT">Microsoft Azure</option>
                </select>
              </div>
              <div>
                <Label htmlFor="voiceId">Voice ID</Label>
                <Input
                  id="voiceId"
                  value={formData.voiceId}
                  onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
                  placeholder="nova, onyx, etc."
                />
              </div>
              <div>
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-US">Spanish (US)</option>
                  <option value="es-ES">Spanish (Spain)</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                </select>
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="NEUTRAL">Neutral</option>
                </select>
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

      {!loading && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Voices</CardTitle>
              <Mic className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{voices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Mic className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {voices.filter(v => v.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Providers</CardTitle>
              <Mic className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(voices.map(v => v.provider)).size}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Languages</CardTitle>
              <Mic className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(voices.map(v => v.language)).size}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Voice Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={voices} />
        </CardContent>
      </Card>
    </div>
  );
}
