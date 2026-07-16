'use client';

import { useState, useEffect } from 'react';
import { Plus, Play, Pause, CheckCircle, Circle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
  voiceCode: string;
  description?: string;
  isActive: boolean;
  provider: {
    name: string;
  };
}

interface VoiceLibraryProps {
  agentId: string;
}

export function VoiceLibrary({ agentId }: VoiceLibraryProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    providerId: '',
    name: '',
    language: 'en',
    gender: 'MALE',
    voiceCode: '',
    description: '',
    isActive: false,
  });

  useEffect(() => {
    fetchVoices();
    fetchProviders();
  }, []);

  const fetchVoices = async () => {
    try {
      const response = await fetch('/api/voice-studio/voices', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setVoices(data);
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/voice-studio/providers', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProviders(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, providerId: data[0].id }));
          fetchAvailableVoices(data[0].type);
        }
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    }
  };

  const fetchAvailableVoices = async (providerType: string) => {
    try {
      const response = await fetch(`/api/voice-studio/providers/${providerType}/available-voices`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableVoices(data);
      }
    } catch (error) {
      console.error('Failed to fetch available voices:', error);
    }
  };

  const createVoice = async () => {
    try {
      const response = await fetch('/api/voice-studio/voices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Voice added to library',
        });
        setDialogOpen(false);
        fetchVoices();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add voice',
        variant: 'destructive',
      });
    }
  };

  const setActiveVoice = async (voiceId: string) => {
    try {
      const response = await fetch('/api/voice-studio/voices/set-active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ voiceId }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Active voice updated',
        });
        fetchVoices();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set active voice',
        variant: 'destructive',
      });
    }
  };

  const previewVoice = (voiceId: string) => {
    setPlayingVoice(voiceId);
    setTimeout(() => setPlayingVoice(null), 3000);
  };

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      mr: 'Marathi',
    };
    return names[code] || code;
  };

  const groupedVoices = voices.reduce((acc, voice) => {
    const key = `${voice.language}-${voice.gender}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(voice);
    return acc;
  }, {} as Record<string, Voice[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading voices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Voice Library</h3>
          <p className="text-sm text-gray-600">
            Manage voices for different languages and genders
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Voice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Voice to Library</DialogTitle>
              <DialogDescription>
                Select a voice from the provider to add to your library
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={formData.providerId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, providerId: value });
                    const provider = providers.find((p) => p.id === value);
                    if (provider) fetchAvailableVoices(provider.type);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData({ ...formData, language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="mr">Marathi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select
                  value={formData.voiceCode}
                  onValueChange={(value) => {
                    const voice = availableVoices.find((v) => v.code === value);
                    setFormData({
                      ...formData,
                      voiceCode: value,
                      name: voice?.name || '',
                      description: voice?.description || '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices
                      .filter(
                        (v) =>
                          v.language === formData.language && v.gender === formData.gender
                      )
                      .map((voice) => (
                        <SelectItem key={voice.code} value={voice.code}>
                          {voice.name} - {voice.description}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createVoice} disabled={!formData.voiceCode}>
                Add Voice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedVoices).map(([key, voiceList]) => {
          const [language, gender] = key.split('-');
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getLanguageName(language)} - {gender}
                  <Badge variant="outline" className="ml-auto">
                    {voiceList.filter((v) => v.isActive).length} Active
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Only one voice can be active per language and gender
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {voiceList.map((voice) => (
                    <div
                      key={voice.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setActiveVoice(voice.id)}
                        >
                          {voice.isActive ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </Button>
                        <div>
                          <p className="font-medium">{voice.name}</p>
                          <p className="text-sm text-gray-600">
                            {voice.provider.name} - {voice.voiceCode}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => previewVoice(voice.id)}
                      >
                        {playingVoice === voice.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {voices.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-600 mb-4">No voices in library</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Voice
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
