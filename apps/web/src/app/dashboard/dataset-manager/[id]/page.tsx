'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  FileAudio,
  FileText,
  MessageSquare,
  Tag,
  Target,
  Shield,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [dataset, setDataset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDatasetDetails();
  }, [params.id]);

  const fetchDatasetDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/dataset/${params.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDataset(data);
      }
    } catch (error) {
      console.error('Failed to fetch dataset details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAll = async () => {
    try {
      const response = await fetch(`/api/v1/dataset/${params.id}/process-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Processing pipeline started' });
        fetchDatasetDetails();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start processing',
        variant: 'destructive',
      });
    }
  };

  const handleStageProcess = async (stage: string) => {
    const endpoints: Record<string, string> = {
      validate: 'validate',
      transcribe: 'transcribe',
      diarize: 'diarize',
      conversation: 'parse-conversation',
      entities: 'extract-entities',
      intents: 'detect-intents',
      classify: 'classify-lead',
      mask: 'mask-pii',
    };

    try {
      const response = await fetch(`/api/v1/dataset/${params.id}/${endpoints[stage]}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        toast({ title: 'Success', description: `${stage} completed successfully` });
        fetchDatasetDetails();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${stage}`,
        variant: 'destructive',
      });
    }
  };

  if (loading || !dataset) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dataset...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: 'secondary',
      PROCESSING: 'default',
      COMPLETED: 'default',
      FAILED: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{dataset.originalFileName}</h1>
            <p className="text-gray-600">Dataset ID: {dataset.id.substring(0, 8)}...</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleProcessAll}>
            <Play className="mr-2 h-4 w-4" />
            Process All
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <FileAudio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {getStatusBadge(dataset.status)}
            <p className="text-xs text-muted-foreground mt-2">
              {dataset.processingStage || 'Not started'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataset.processingProgress}%</div>
            <Progress value={dataset.processingProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">File Size</CardTitle>
            <FileAudio className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(Number(dataset.fileSize) / (1024 * 1024)).toFixed(2)} MB
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dataset.recordings?.[0]?.duration
                ? `${Math.floor(dataset.recordings[0].duration / 60)}m ${Math.floor(dataset.recordings[0].duration % 60)}s`
                : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="intents">Intents</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Original File Name</p>
                  <p className="font-medium">{dataset.originalFileName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">File Hash</p>
                  <p className="font-mono text-xs">{dataset.fileHash}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">MIME Type</p>
                  <p className="font-medium">{dataset.mimeType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Upload Date</p>
                  <p className="font-medium">
                    {new Date(dataset.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audio Validation */}
          {dataset.recordings && dataset.recordings[0] && (
            <Card>
              <CardHeader>
                <CardTitle>Audio Validation</CardTitle>
                <CardDescription>Technical audio properties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Sample Rate</p>
                    <p className="font-medium">
                      {dataset.recordings[0].sampleRate || 'N/A'} Hz
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Channels</p>
                    <p className="font-medium">{dataset.recordings[0].channels || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bitrate</p>
                    <p className="font-medium">
                      {dataset.recordings[0].bitrate || 'N/A'} kbps
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Noise Level</p>
                    <p className="font-medium">
                      {dataset.recordings[0].noiseLevel
                        ? `${(dataset.recordings[0].noiseLevel * 100).toFixed(1)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Silence</p>
                    <p className="font-medium">
                      {dataset.recordings[0].silencePercent
                        ? `${dataset.recordings[0].silencePercent.toFixed(1)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge
                      variant={
                        dataset.recordings[0].isCorrupted ? 'destructive' : 'default'
                      }
                    >
                      {dataset.recordings[0].isCorrupted ? 'Corrupted' : 'Valid'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Pipeline</CardTitle>
              <CardDescription>Execute processing stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Validation</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStageProcess('validate')}
                  >
                    Run
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Transcription</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStageProcess('transcribe')}
                  >
                    Run
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    <span className="font-medium">Speaker Diarization</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStageProcess('diarize')}
                  >
                    Run
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Conversation Parsing</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStageProcess('conversation')}
                  >
                    Run
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Entity Extraction</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStageProcess('entities')}
                  >
                    Run
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-pink-500" />
                    <span className="font-medium">Intent Detection</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStageProcess('intents')}
                  >
                    Run
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-500" />
                    <span className="font-medium">PII Masking</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStageProcess('mask')}
                  >
                    Run
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>
                {dataset.transcript
                  ? `${dataset.transcript.wordCount} words • ${dataset.transcript.language}`
                  : 'Not available'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataset.transcript ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded border">
                    <pre className="whitespace-pre-wrap font-sans">
                      {dataset.transcript.processedText || dataset.transcript.rawText}
                    </pre>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Words</p>
                      <p className="font-medium">{dataset.transcript.wordCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Language</p>
                      <p className="font-medium uppercase">
                        {dataset.transcript.language}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Confidence</p>
                      <p className="font-medium">
                        {(dataset.transcript.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Transcript not yet generated</p>
                  <Button
                    onClick={() => handleStageProcess('transcribe')}
                    className="mt-4"
                  >
                    Generate Transcript
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversation Tab */}
        <TabsContent value="conversation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Structured Conversation</CardTitle>
              <CardDescription>
                {dataset.conversation
                  ? `${dataset.conversation.messageCount} messages`
                  : 'Not available'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataset.conversation && dataset.conversation.structuredData ? (
                <div className="space-y-3">
                  {dataset.conversation.structuredData.messages.map(
                    (message: any, index: number) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'AGENT' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.role === 'AGENT'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-green-100 text-green-900'
                          }`}
                        >
                          <p className="text-xs font-semibold mb-1">
                            {message.role}
                          </p>
                          <p>{message.text}</p>
                          <p className="text-xs mt-1 text-gray-600">
                            {message.timestamp.toFixed(1)}s
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Conversation not yet parsed</p>
                  <Button
                    onClick={() => handleStageProcess('conversation')}
                    className="mt-4"
                  >
                    Parse Conversation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entities Tab */}
        <TabsContent value="entities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Extracted Entities</CardTitle>
              <CardDescription>
                {dataset.entities?.length || 0} entities found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataset.entities && dataset.entities.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Masked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataset.entities.map((entity: any) => (
                      <TableRow key={entity.id}>
                        <TableCell>
                          <Badge>{entity.entityType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {entity.isMasked ? entity.maskedValue : entity.entityValue}
                        </TableCell>
                        <TableCell>
                          {entity.confidence
                            ? `${(entity.confidence * 100).toFixed(1)}%`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {entity.isMasked ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Entities not yet extracted</p>
                  <Button
                    onClick={() => handleStageProcess('entities')}
                    className="mt-4"
                  >
                    Extract Entities
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intents Tab */}
        <TabsContent value="intents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detected Intents</CardTitle>
              <CardDescription>
                {dataset.intents?.length || 0} intents detected
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataset.intents && dataset.intents.length > 0 ? (
                <div className="space-y-3">
                  {dataset.intents.map((intent: any) => (
                    <div key={intent.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-500" />
                        <span className="font-medium">{intent.intentType}</span>
                      </div>
                      <Badge>
                        {(intent.confidence * 100).toFixed(1)}% confidence
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Intents not yet detected</p>
                  <Button
                    onClick={() => handleStageProcess('intents')}
                    className="mt-4"
                  >
                    Detect Intents
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing Jobs</CardTitle>
              <CardDescription>
                {dataset.jobs?.length || 0} jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataset.jobs && dataset.jobs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataset.jobs.map((job: any) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.jobType}</TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>
                          {job.startedAt
                            ? new Date(job.startedAt).toLocaleString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {job.completedAt
                            ? new Date(job.completedAt).toLocaleString()
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No processing jobs yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing Logs</CardTitle>
              <CardDescription>
                {dataset.logs?.length || 0} log entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataset.logs && dataset.logs.length > 0 ? (
                <div className="space-y-2">
                  {dataset.logs.map((log: any) => (
                    <div
                      key={log.id}
                      className={`p-3 border-l-4 rounded ${
                        log.level === 'ERROR'
                          ? 'border-red-500 bg-red-50'
                          : log.level === 'WARN'
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline">{log.stage}</Badge>
                        <span className="text-xs text-gray-600">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{log.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No logs available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
