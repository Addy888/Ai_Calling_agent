'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Download, Volume2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
  isActive: boolean;
}

interface VoicePreviewProps {
  agentId: string;
}

export function VoicePreview({ agentId }: VoicePreviewProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchVoices();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onplay = () => setPlaying(true);
      audioRef.current.onpause = () => setPlaying(false);
    }
  }, []);

  const fetchVoices = async () => {
    try {
      const response = await fetch('/api/v1/voice-studio/voices', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setVoices(data);
        const activeVoice = data.find((v: Voice) => v.isActive);
        if (activeVoice) {
          setSelectedVoice(activeVoice.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error);
    }
  };

  const generateVoice = async () => {
    if (!selectedVoice || !text.trim()) {
      toast({
        title: 'Error',
        description: 'Please select a voice and enter text',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/v1/voice-studio/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          voiceId: selectedVoice,
          text,
          saveToHistory: false,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        const data = await response.json();
        const audioBlob = base64ToBlob(data.audio, 'audio/wav');
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setDuration(data.duration);

        toast({
          title: 'Success',
          description: 'Voice generated successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate voice',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `voice-preview-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const sampleTexts = [
    'Hello, thank you for your time. I would like to tell you about our latest property project.',
    'Good morning! How may I assist you today?',
    'Welcome to our service. We are here to help you with all your needs.',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Voice Preview</h3>
        <p className="text-sm text-gray-600">
          Test voice generation with custom text
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Voice</CardTitle>
          <CardDescription>
            Enter text and generate voice preview
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Voice</Label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name} - {voice.language.toUpperCase()} {voice.gender}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Text to Speak</Label>
              <div className="flex gap-2">
                {sampleTexts.map((sample, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setText(sample)}
                  >
                    Sample {index + 1}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the text you want to convert to speech..."
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{text.length} characters</span>
              <span>~{Math.ceil(text.split(' ').length / 2.5)} seconds</span>
            </div>
          </div>

          {generating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generating voice...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <Button
            onClick={generateVoice}
            disabled={generating || !selectedVoice || !text.trim()}
            className="w-full"
          >
            <Volume2 className="mr-2 h-4 w-4" />
            {generating ? 'Generating...' : 'Generate Voice'}
          </Button>
        </CardContent>
      </Card>

      {audioUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Audio Player</CardTitle>
            <CardDescription>
              Play, pause, or download the generated audio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <audio ref={audioRef} src={audioUrl} className="hidden" />

            <div className="flex items-center justify-center gap-4">
              {!playing ? (
                <Button onClick={playAudio} size="lg">
                  <Play className="h-5 w-5" />
                </Button>
              ) : (
                <Button onClick={pauseAudio} size="lg" variant="secondary">
                  <Pause className="h-5 w-5" />
                </Button>
              )}
              <Button onClick={stopAudio} size="lg" variant="outline">
                <Square className="h-5 w-5" />
              </Button>
              <Button onClick={downloadAudio} size="lg" variant="outline">
                <Download className="h-5 w-5" />
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Duration: {Math.round(duration / 1000)} seconds
              </p>
            </div>

            <div className="w-full h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg opacity-20 animate-pulse"></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
