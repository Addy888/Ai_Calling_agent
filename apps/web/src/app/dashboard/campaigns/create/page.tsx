'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Users,
  Bot,
  Phone,
  Mic,
  Brain,
  BookOpen,
  Zap,
  Clock,
  Settings2,
  Play,
  Save,
  ArrowLeft,
  Shield,
  Wifi,
  Signal,
  SlidersHorizontal,
  RefreshCw,
  X,
  Info,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/use-toast';
import {
  campaignApi,
  scriptApi,
  promptApi,
  telephonyProfileApi,
  aiAgentApi,
  voiceLibraryApi,
  knowledgeBaseApi,
  campaignContactsApi,
} from '@/lib/api';
import type {
  Script,
  Prompt,
  PromptStatus,
  TelephonyProfile,
  AIAgent,
  VoiceLibrary,
  CampaignUpload,
  CreateCampaignExtendedDto,
  CampaignStatus,
} from '@/types';

// ────────────────────────────────────────────────────────────────────────────
// Section Component
// ────────────────────────────────────────────────────────────────────────────

interface SectionProps {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  isOpen: boolean;
  isComplete: boolean;
  hasError?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}

function Section({ id, title, subtitle, icon, isOpen, isComplete, hasError, onToggle, children, badge }: SectionProps) {
  return (
    <div
      id={id}
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isOpen
          ? 'border-indigo-500/40 shadow-lg shadow-indigo-500/5'
          : hasError
          ? 'border-red-500/30'
          : isComplete
          ? 'border-emerald-500/30'
          : 'border-white/10'
      }`}
      style={{ background: 'rgba(15,15,25,0.7)', backdropFilter: 'blur(20px)' }}
    >
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 group hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              hasError
                ? 'bg-red-500/20 text-red-400'
                : isComplete
                ? 'bg-emerald-500/20 text-emerald-400'
                : isOpen
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            {icon}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white/90 text-sm">{title}</span>
              {badge && (
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-xs text-white/40 mt-0.5">{subtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasError && <AlertCircle className="w-4 h-4 text-red-400" />}
          {isComplete && !hasError && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <div className={`text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* Section Body */}
      <div className={`transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="px-5 pb-5 border-t border-white/5">
          <div className="pt-5 space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Field Row
// ────────────────────────────────────────────────────────────────────────────

function FieldRow({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={`grid gap-4 ${cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-white/60 flex items-center gap-1">
        {label}
        {required && <span className="text-red-400">*</span>}
        {hint && (
          <span title={hint} className="cursor-help">
            <Info className="w-3 h-3 text-white/30" />
          </span>
        )}
      </Label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Styled Select
// ────────────────────────────────────────────────────────────────────────────

function StyledSelect({
  value,
  onValueChange,
  placeholder,
  children,
  disabled,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className="h-9 text-sm border-white/10 text-white"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-[#0f0f1a] border-white/10 text-white">{children}</SelectContent>
    </Select>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Upload Drop Zone
// ────────────────────────────────────────────────────────────────────────────

function UploadDropZone({
  file,
  onFile,
  uploadStatus,
}: {
  file: File | null;
  onFile: (f: File) => void;
  uploadStatus: CampaignUpload | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  };

  const statusColor = uploadStatus?.status === 'COMPLETED'
    ? 'border-emerald-500/50 bg-emerald-500/5'
    : uploadStatus?.status === 'FAILED'
    ? 'border-red-500/50 bg-red-500/5'
    : uploadStatus?.status && ['PENDING', 'VALIDATING', 'PROCESSING'].includes(uploadStatus.status)
    ? 'border-indigo-500/50 bg-indigo-500/5'
    : dragging
    ? 'border-indigo-500/70 bg-indigo-500/10'
    : 'border-white/15 bg-white/[0.02]';

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl border-2 border-dashed ${statusColor} transition-all duration-300 cursor-pointer`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
        />

        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          {!file ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-white/70 font-medium text-sm">Drop your contact file here</p>
              <p className="text-white/30 text-xs mt-1">CSV, XLSX, XLS supported · Max 50MB</p>
              <button
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="mt-4 text-xs text-indigo-400 border border-indigo-500/30 rounded-lg px-4 py-2 hover:bg-indigo-500/10 transition-colors"
              >
                Choose File
              </button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-white/80 font-medium text-sm truncate max-w-xs">{file.name}</p>
              <p className="text-white/30 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              {!uploadStatus && (
                <button
                  onClick={(e) => { e.stopPropagation(); onFile(file); }}
                  className="mt-3 text-xs text-white/40 hover:text-white/60 transition-colors underline"
                >
                  Change file
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Upload Progress / Stats */}
      {uploadStatus && (
        <UploadStats upload={uploadStatus} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Upload Stats
// ────────────────────────────────────────────────────────────────────────────

function UploadStats({ upload }: { upload: CampaignUpload }) {
  const isProcessing = ['PENDING', 'VALIDATING', 'PROCESSING'].includes(upload.status);
  const isCompleted = upload.status === 'COMPLETED';
  const isFailed = upload.status === 'FAILED';

  const statCards = [
    { label: 'Total Detected', value: upload.totalRows ?? '—', color: 'text-white/80' },
    { label: 'Valid Contacts', value: upload.validRows ?? '—', color: 'text-emerald-400' },
    { label: 'Duplicates', value: upload.duplicateRows ?? '—', color: 'text-amber-400' },
    { label: 'Invalid Numbers', value: upload.invalidRows ?? '—', color: 'text-red-400' },
  ];

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
      {/* Status Bar */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-white/5 ${
        isCompleted ? 'bg-emerald-500/5' : isFailed ? 'bg-red-500/5' : 'bg-indigo-500/5'
      }`}>
        {isProcessing && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        {isFailed && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
        <span className={`text-xs font-medium ${
          isCompleted ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-indigo-400'
        }`}>
          {isProcessing ? 'Processing contacts...' : isCompleted ? 'Contacts processed successfully' : 'Processing failed'}
        </span>
        <span className="text-xs text-white/30 ml-auto capitalize">{upload.status}</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 divide-x divide-white/5">
        {statCards.map((s) => (
          <div key={s.label} className="p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-white/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Errors */}
      {upload.validationErrors && upload.validationErrors.length > 0 && !isProcessing && (
        <div className="px-4 pb-4 border-t border-white/5">
          <div className="mt-3 rounded-lg bg-red-500/5 border border-red-500/20 p-3 max-h-32 overflow-y-auto">
            {upload.validationErrors.slice(0, 5).map((e, i) => (
              <p key={i} className="text-xs text-red-300/80">
                Row {e.row}{e.phone ? ` · ${e.phone}` : ''}: {e.errors?.join(', ')}
              </p>
            ))}
            {upload.validationErrors.length > 5 && (
              <p className="text-xs text-white/30 mt-1">+{upload.validationErrors.length - 5} more errors</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Campaign Summary Panel
// ────────────────────────────────────────────────────────────────────────────

function SummaryPanel({
  form,
  telephonyProfiles,
  aiAgents,
  voices,
  uploadStatus,
}: {
  form: any;
  telephonyProfiles: TelephonyProfile[];
  aiAgents: AIAgent[];
  voices: VoiceLibrary[];
  uploadStatus: CampaignUpload | null;
}) {
  const profile = telephonyProfiles.find((p) => p.id === form.telephonyProfileId);
  const agent = aiAgents.find((a) => a.id === form.settings?.aiAgentId);
  const voice = voices.find((v) => v.id === form.voiceId);
  const totalContacts = uploadStatus?.validRows ?? 0;
  const concurrentCalls = form.concurrentCalls ?? 1;
  const callDuration = 3; // avg minutes
  const estimatedMinutes = totalContacts > 0
    ? Math.ceil((totalContacts / concurrentCalls) * callDuration)
    : 0;

  const rows = [
    { label: 'Campaign Name', value: form.name || '—' },
    { label: 'AI Agent', value: agent?.name || '—' },
    { label: 'Voice', value: voice ? `${voice.name} (${voice.language}/${voice.gender})` : '—' },
    { label: 'Telephony Profile', value: profile ? `${profile.name} · ${profile.callerNumber}` : '—' },
    { label: 'Gateway', value: profile?.gateway?.name || '—' },
    { label: 'SIM / Caller', value: profile?.sim?.simNumber || profile?.callerNumber || '—' },
    { label: 'Concurrent Calls', value: String(concurrentCalls) },
    { label: 'Total Contacts', value: String(totalContacts) },
    { label: 'Estimated Duration', value: estimatedMinutes ? `~${estimatedMinutes} min` : '—' },
    { label: 'Estimated Queue Size', value: totalContacts ? String(totalContacts) : '—' },
  ];

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(15,15,25,0.8)', backdropFilter: 'blur(20px)' }}>
      <div className="px-5 py-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white/80">Campaign Summary</h3>
        <p className="text-xs text-white/30 mt-0.5">Review before launching</p>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between px-5 py-3">
            <span className="text-xs text-white/40 min-w-[140px]">{row.label}</span>
            <span className="text-xs text-white/80 font-medium text-right">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────────────

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'America/New_York', 'America/Chicago',
  'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Singapore',
  'Asia/Tokyo', 'Australia/Sydney', 'UTC',
];

const CAMPAIGN_TYPES = [
  { value: 'OUTBOUND_SALES', label: 'Outbound Sales' },
  { value: 'LEAD_QUALIFICATION', label: 'Lead Qualification' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'APPOINTMENT_REMINDER', label: 'Appointment Reminder' },
  { value: 'SURVEY', label: 'Customer Survey' },
  { value: 'DEBT_COLLECTION', label: 'Debt Collection' },
  { value: 'CUSTOMER_SUPPORT', label: 'Customer Support' },
  { value: 'CUSTOM', label: 'Custom' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mr', label: 'Marathi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'bn', label: 'Bengali' },
];

const INTERRUPT_MODES = [
  { value: 'ALLOW', label: 'Allow Interruptions' },
  { value: 'IGNORE', label: 'Ignore Interruptions' },
  { value: 'PAUSE', label: 'Pause & Resume' },
];

type OpenSections = Record<string, boolean>;

export default function CreateCampaignPage() {
  const router = useRouter();

  // ── Open/Close sections ────────────────────────────────────────────────────
  const [openSections, setOpenSections] = useState<OpenSections>({
    info: true,
    ai: false,
    telephony: false,
    contacts: false,
    summary: false,
  });

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Remote data ────────────────────────────────────────────────────────────
  const [scripts, setScripts] = useState<Script[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [telephonyProfiles, setTelephonyProfiles] = useState<TelephonyProfile[]>([]);
  const [aiAgents, setAiAgents] = useState<AIAgent[]>([]);
  const [voices, setVoices] = useState<VoiceLibrary[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<Partial<CreateCampaignExtendedDto>>({
    name: '',
    description: '',
    campaignType: '',
    timezone: 'Asia/Kolkata',
    concurrentCalls: 2,
    callDelay: 5,
    maxRetries: 3,
    retryDelay: 300,
    settings: {
      memoryEnabled: true,
      temperature: 0.7,
      maxTokens: 1024,
      interruptMode: 'ALLOW',
      silenceTimeout: 3,
      language: 'en',
      enableRecording: true,
      enableTranscript: true,
      enableAmd: true,
      voicemailDetection: true,
    },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── File / Upload state ────────────────────────────────────────────────────
  const [contactFile, setContactFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<CampaignUpload | null>(null);
  const [pendingUploadCampaignId, setPendingUploadCampaignId] = useState<string | null>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);

  // ── Submission state ───────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load resources ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingResources(true);
        const [scriptsRes, promptsRes, profilesRes, agentsRes, voicesRes, kbRes] = await Promise.allSettled([
          scriptApi.getAll({ limit: 100, filters: { isActive: true } }),
          promptApi.getAll({ limit: 100, filters: { status: ['ACTIVE' as any] } }),
          telephonyProfileApi.getAll({ isActive: true }),
          aiAgentApi.getAll({ limit: 100 }),
          voiceLibraryApi.getAll(),
          knowledgeBaseApi.getAll({ isActive: true, limit: 100 }),
        ]);

        if (scriptsRes.status === 'fulfilled') setScripts(scriptsRes.value.data?.data?.items ?? []);
        if (promptsRes.status === 'fulfilled') setPrompts(promptsRes.value.data?.data?.items ?? []);
        if (profilesRes.status === 'fulfilled') setTelephonyProfiles(profilesRes.value.data?.data?.items ?? []);
        if (agentsRes.status === 'fulfilled') {
          const agentData = agentsRes.value.data?.data;
          setAiAgents(Array.isArray(agentData) ? agentData : agentData?.items ?? agentData?.agents ?? []);
        }
        if (voicesRes.status === 'fulfilled') {
          const voiceData = voicesRes.value.data?.data as any;
          setVoices(Array.isArray(voiceData) ? voiceData : voiceData?.voices ?? []);
        }
        if (kbRes.status === 'fulfilled') {
          const kbData = kbRes.value.data?.data as any;
          setKnowledgeBases(Array.isArray(kbData) ? kbData : kbData?.items ?? []);
        }
      } catch (e) {
        // Resources loaded partially — don't block the form
      } finally {
        setLoadingResources(false);
      }
    };
    load();
  }, []);

  // ── Poll upload status ─────────────────────────────────────────────────────
  const startPolling = useCallback((campaignId: string, uploadId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await campaignContactsApi.getUploadStatus(campaignId, uploadId);
        const status: CampaignUpload = res.data.data;
        setUploadStatus(status);
        if (['COMPLETED', 'FAILED', 'INVALID'].includes(status.status)) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch (e) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
      }
    }, 1500);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── File selected handler ──────────────────────────────────────────────────
  const handleFileSelected = useCallback((file: File) => {
    setContactFile(file);
    setUploadStatus(null);
    setPendingUploadId(null);
    // Open contacts section
    setOpenSections((prev) => ({ ...prev, contacts: true }));
  }, []);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const setField = (key: keyof CreateCampaignExtendedDto, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const setSetting = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, settings: { ...prev.settings, [key]: value } }));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name?.trim()) errs.name = 'Campaign name is required';
    if (!form.telephonyProfileId) errs.telephonyProfileId = 'Select a telephony profile';
    if (!contactFile && !uploadStatus) errs.contactFile = 'Upload a contact file to proceed';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Build campaign payload ─────────────────────────────────────────────────
  const buildPayload = (status: CampaignStatus | 'DRAFT') => ({
    name: form.name,
    description: form.description,
    status: status as CampaignStatus,
    scriptId: form.scriptId || undefined,
    promptId: form.promptId || undefined,
    voiceId: form.voiceId || undefined,
    telephonyProfileId: form.telephonyProfileId || undefined,
    concurrentCalls: form.concurrentCalls,
    callDelay: form.callDelay,
    maxRetries: form.maxRetries,
    retryDelay: form.retryDelay,
    startDate: form.startDate || undefined,
    endDate: form.endDate || undefined,
    timezone: form.timezone,
    settings: {
      ...(form.settings ?? {}),
      campaignType: form.campaignType,
    },
  });

  // ── Upload contacts for a campaign ────────────────────────────────────────
  const uploadContacts = async (campaignId: string): Promise<string | null> => {
    if (!contactFile) return null;
    const uploadRes = await campaignContactsApi.uploadFile(campaignId, contactFile);
    const uploadId = uploadRes.data.data.uploadId;
    setPendingUploadCampaignId(campaignId);
    setPendingUploadId(uploadId);
    startPolling(campaignId, uploadId);
    return uploadId;
  };

  // ── Wait for upload to complete ────────────────────────────────────────────
  const waitForUpload = (campaignId: string, uploadId: string): Promise<CampaignUpload> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const res = await campaignContactsApi.getUploadStatus(campaignId, uploadId);
          const status: CampaignUpload = res.data.data;
          setUploadStatus(status);
          if (status.status === 'COMPLETED') {
            clearInterval(interval);
            resolve(status);
          } else if (['FAILED', 'INVALID'].includes(status.status)) {
            clearInterval(interval);
            reject(new Error(`Contact processing ${status.status.toLowerCase()}`));
          }
        } catch (e) {
          clearInterval(interval);
          reject(e);
        }
      }, 1500);
    });
  };

  // ── Save Draft ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!form.name?.trim()) {
      setErrors({ name: 'Campaign name is required' });
      setOpenSections((prev) => ({ ...prev, info: true }));
      return;
    }
    try {
      setSaving(true);
      const campaignRes = await campaignApi.create(buildPayload('DRAFT') as any);
      const campaignId = campaignRes.data.data.id;

      if (contactFile) {
        await uploadContacts(campaignId);
      }

      toast({ title: 'Draft saved', description: `Campaign "${form.name}" saved as draft` });
      router.push('/dashboard/campaigns');
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.response?.data?.message || 'Failed to save draft',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Start Campaign ─────────────────────────────────────────────────────────
  const handleStartCampaign = async () => {
    if (!validate()) {
      // Open errored sections
      if (errors.name || errors.description) setOpenSections((p) => ({ ...p, info: true }));
      if (errors.telephonyProfileId) setOpenSections((p) => ({ ...p, telephony: true }));
      if (errors.contactFile) setOpenSections((p) => ({ ...p, contacts: true }));
      return;
    }
    try {
      setStarting(true);

      // Step 1: Create Campaign
      toast({ title: 'Creating campaign…', description: 'Setting up your campaign configuration' });
      const campaignRes = await campaignApi.create(buildPayload('DRAFT') as any);
      const campaignId = campaignRes.data.data.id;

      // Step 2: Upload & Validate Contacts
      toast({ title: 'Uploading contacts…', description: 'Parsing and validating your contact file' });
      const uploadId = await uploadContacts(campaignId);

      if (uploadId) {
        toast({ title: 'Validating contacts…', description: 'Processing contact file' });
        const finalUpload = await waitForUpload(campaignId, uploadId);

        if ((finalUpload.validRows ?? 0) === 0) {
          toast({
            title: 'No valid contacts',
            description: `File processed but found 0 valid contacts. Duplicates: ${finalUpload.duplicateRows}, Invalid: ${finalUpload.invalidRows}`,
            variant: 'destructive',
          });
          // Campaign stays as DRAFT — redirect there
          router.push(`/dashboard/campaigns/${campaignId}`);
          return;
        }
      }

      // Step 3: Start Campaign → BullMQ → Asterisk → GSM Gateway → SIM → Customer
      toast({ title: 'Starting campaign…', description: 'Dispatching calls to queue' });
      await campaignApi.start(campaignId, { concurrentCalls: form.concurrentCalls });

      toast({
        title: '🚀 Campaign launched!',
        description: `Calls are being dispatched via ${telephonyProfiles.find((p) => p.id === form.telephonyProfileId)?.sim?.simNumber ?? 'your registered SIM'}`,
      });
      router.push(`/dashboard/campaigns/${campaignId}`);
    } catch (e: any) {
      toast({
        title: 'Launch failed',
        description: e?.response?.data?.message || e?.message || 'Failed to start campaign',
        variant: 'destructive',
      });
    } finally {
      setStarting(false);
    }
  };

  // ── Section completion checks ──────────────────────────────────────────────
  const infoComplete = !!(form.name?.trim());
  const aiComplete = !!(form.settings?.aiAgentId || form.promptId || form.scriptId);
  const telephonyComplete = !!form.telephonyProfileId;
  const contactsComplete = !!(uploadStatus?.status === 'COMPLETED');

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg,#06060f 0%,#0c0c1a 50%,#080818 100%)' }}
    >
      {/* Top Bar */}
      <div
        className="sticky top-0 z-40 border-b border-white/5 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(6,6,15,0.95)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/campaigns')}
            className="h-8 w-8 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-base font-semibold text-white/90">Create AI Campaign</h1>
            <p className="text-xs text-white/30">Enterprise AI Calling Campaign Builder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loadingResources && (
            <div className="flex items-center gap-2 text-xs text-white/40 mr-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading resources…
            </div>
          )}
          <Button
            variant="ghost"
            onClick={handleSaveDraft}
            disabled={saving || starting}
            className="h-9 px-4 text-sm text-white/60 hover:text-white/80 hover:bg-white/5 border border-white/10"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
            Save Draft
          </Button>
          <Button
            onClick={handleStartCampaign}
            disabled={saving || starting}
            className="h-9 px-5 text-sm font-medium"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}
          >
            {starting ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-2 fill-current" />}
            {starting ? 'Launching…' : 'Start Campaign'}
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          {/* Left — Sections */}
          <div className="space-y-4">

            {/* ── Section 1: Campaign Information ─────────────────────────── */}
            <Section
              id="section-info"
              title="Campaign Information"
              subtitle="Name, type, schedule and timezone"
              icon={<FileText className="w-4 h-4" />}
              isOpen={openSections.info}
              isComplete={infoComplete}
              hasError={!!(errors.name)}
              onToggle={() => toggleSection('info')}
            >
              <FieldRow>
                <Field label="Campaign Name" required error={errors.name}>
                  <Input
                    value={form.name ?? ''}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="e.g. Q3 Lead Qualification Drive"
                    className="h-9 text-sm border-white/10 bg-white/[0.04] text-white placeholder:text-white/20"
                  />
                </Field>
                <Field label="Campaign Type">
                  <StyledSelect
                    value={form.campaignType ?? ''}
                    onValueChange={(v) => setField('campaignType', v)}
                    placeholder="Select campaign type"
                  >
                    {CAMPAIGN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </StyledSelect>
                </Field>
              </FieldRow>

              <Field label="Description">
                <Textarea
                  value={form.description ?? ''}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Brief description of this campaign's objective…"
                  rows={2}
                  className="text-sm border-white/10 bg-white/[0.04] text-white placeholder:text-white/20 resize-none"
                />
              </Field>

              <FieldRow cols={3}>
                <Field label="Start Date">
                  <Input
                    type="datetime-local"
                    value={form.startDate ?? ''}
                    onChange={(e) => setField('startDate', e.target.value)}
                    className="h-9 text-sm border-white/10 bg-white/[0.04] text-white"
                  />
                </Field>
                <Field label="End Date">
                  <Input
                    type="datetime-local"
                    value={form.endDate ?? ''}
                    onChange={(e) => setField('endDate', e.target.value)}
                    className="h-9 text-sm border-white/10 bg-white/[0.04] text-white"
                  />
                </Field>
                <Field label="Timezone">
                  <StyledSelect
                    value={form.timezone ?? 'Asia/Kolkata'}
                    onValueChange={(v) => setField('timezone', v)}
                    placeholder="Select timezone"
                  >
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </StyledSelect>
                </Field>
              </FieldRow>
            </Section>

            {/* ── Section 2: AI Configuration ──────────────────────────────── */}
            <Section
              id="section-ai"
              title="AI Configuration"
              subtitle="Agent, voice, prompt, knowledge base and behavior"
              icon={<Bot className="w-4 h-4" />}
              isOpen={openSections.ai}
              isComplete={aiComplete}
              onToggle={() => toggleSection('ai')}
              badge={aiComplete ? 'Configured' : undefined}
            >
              <FieldRow>
                <Field label="AI Agent" hint="The conversational AI that will handle calls">
                  <StyledSelect
                    value={form.settings?.aiAgentId ?? ''}
                    onValueChange={(v) => setSetting('aiAgentId', v)}
                    placeholder={aiAgents.length === 0 ? 'No agents available' : 'Select AI agent'}
                    disabled={aiAgents.length === 0}
                  >
                    {aiAgents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}{a.type ? ` · ${a.type}` : ''}
                      </SelectItem>
                    ))}
                  </StyledSelect>
                </Field>

                <Field label="Language">
                  <StyledSelect
                    value={form.settings?.language ?? 'en'}
                    onValueChange={(v) => setSetting('language', v)}
                    placeholder="Select language"
                  >
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </StyledSelect>
                </Field>
              </FieldRow>

              <FieldRow>
                <Field label="Voice" hint="TTS voice for AI speech">
                  <StyledSelect
                    value={form.voiceId ?? ''}
                    onValueChange={(v) => setField('voiceId', v)}
                    placeholder={voices.length === 0 ? 'No voices available' : 'Select voice'}
                    disabled={voices.length === 0}
                  >
                    {voices.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} · {v.language} / {v.gender}
                      </SelectItem>
                    ))}
                  </StyledSelect>
                </Field>

                <Field label="Prompt">
                  <StyledSelect
                    value={form.promptId ?? ''}
                    onValueChange={(v) => setField('promptId', v)}
                    placeholder={prompts.length === 0 ? 'No prompts available' : 'Select prompt'}
                    disabled={prompts.length === 0}
                  >
                    <SelectItem value="">No prompt</SelectItem>
                    {prompts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} (v{p.version})</SelectItem>
                    ))}
                  </StyledSelect>
                </Field>
              </FieldRow>

              <FieldRow>
                <Field label="Script">
                  <StyledSelect
                    value={form.scriptId ?? ''}
                    onValueChange={(v) => setField('scriptId', v)}
                    placeholder={scripts.length === 0 ? 'No scripts available' : 'Select script'}
                    disabled={scripts.length === 0}
                  >
                    <SelectItem value="">No script</SelectItem>
                    {scripts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} (v{s.version})</SelectItem>
                    ))}
                  </StyledSelect>
                </Field>

                <Field label="Knowledge Base">
                  <StyledSelect
                    value={form.settings?.knowledgeBaseId ?? ''}
                    onValueChange={(v) => setSetting('knowledgeBaseId', v)}
                    placeholder={knowledgeBases.length === 0 ? 'No KB available' : 'Select knowledge base'}
                    disabled={knowledgeBases.length === 0}
                  >
                    <SelectItem value="">None</SelectItem>
                    {knowledgeBases.map((kb: any) => (
                      <SelectItem key={kb.id} value={kb.id}>{kb.title ?? kb.name}</SelectItem>
                    ))}
                  </StyledSelect>
                </Field>
              </FieldRow>

              {/* Behavior toggles */}
              <div className="rounded-xl border border-white/5 p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Behavior</p>
                <FieldRow cols={3}>
                  <Field label="Interrupt Mode">
                    <StyledSelect
                      value={form.settings?.interruptMode ?? 'ALLOW'}
                      onValueChange={(v) => setSetting('interruptMode', v)}
                      placeholder="Mode"
                    >
                      {INTERRUPT_MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </StyledSelect>
                  </Field>
                  <Field label={`Silence Timeout (${form.settings?.silenceTimeout ?? 3}s)`}>
                    <Slider
                      value={[form.settings?.silenceTimeout ?? 3]}
                      onValueChange={([v]) => setSetting('silenceTimeout', v)}
                      min={1} max={15} step={1}
                      className="mt-2"
                    />
                  </Field>
                  <Field label={`Temperature (${form.settings?.temperature ?? 0.7})`} hint="Controls AI creativity">
                    <Slider
                      value={[form.settings?.temperature ?? 0.7]}
                      onValueChange={([v]) => setSetting('temperature', v)}
                      min={0} max={1} step={0.05}
                      className="mt-2"
                    />
                  </Field>
                </FieldRow>

                <FieldRow cols={3}>
                  <Field label={`Max Tokens`}>
                    <Input
                      type="number"
                      value={form.settings?.maxTokens ?? 1024}
                      onChange={(e) => setSetting('maxTokens', Number(e.target.value))}
                      min={128} max={8192} step={128}
                      className="h-9 text-sm border-white/10 bg-white/[0.04] text-white"
                    />
                  </Field>
                  <Field label="Memory">
                    <div className="flex items-center gap-3 h-9">
                      <Switch
                        checked={form.settings?.memoryEnabled ?? true}
                        onCheckedChange={(v) => setSetting('memoryEnabled', v)}
                      />
                      <span className="text-xs text-white/50">
                        {form.settings?.memoryEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </Field>
                </FieldRow>
              </div>
            </Section>

            {/* ── Section 3: Telephony Configuration ───────────────────────── */}
            <Section
              id="section-telephony"
              title="Telephony Configuration"
              subtitle="GSM Gateway, registered SIM, calling parameters"
              icon={<Phone className="w-4 h-4" />}
              isOpen={openSections.telephony}
              isComplete={telephonyComplete}
              hasError={!!errors.telephonyProfileId}
              onToggle={() => toggleSection('telephony')}
            >
              {/* Telephony Profile Selector */}
              <Field label="Telephony Profile" required error={errors.telephonyProfileId} hint="Select a registered GSM Gateway + SIM profile">
                <div className="space-y-3">
                  {telephonyProfiles.length === 0 ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-amber-300 font-medium">No telephony profiles found</p>
                        <p className="text-xs text-amber-300/60 mt-1">
                          Go to Settings → Telephony to register a GSM Gateway and SIM card first.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {telephonyProfiles.map((profile) => {
                        const selected = form.telephonyProfileId === profile.id;
                        return (
                          <button
                            key={profile.id}
                            onClick={() => setField('telephonyProfileId', profile.id)}
                            className={`w-full text-left rounded-xl border p-4 transition-all ${
                              selected
                                ? 'border-indigo-500/60 bg-indigo-500/10'
                                : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-white/90">{profile.name}</span>
                                  {profile.isDefault && (
                                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">Default</span>
                                  )}
                                  {!profile.isActive && (
                                    <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">Inactive</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-white/40">
                                  {profile.gateway && (
                                    <span className="flex items-center gap-1">
                                      <Wifi className="w-3 h-3" />
                                      {profile.gateway.name}
                                    </span>
                                  )}
                                  {profile.sim && (
                                    <span className="flex items-center gap-1">
                                      <Signal className="w-3 h-3" />
                                      SIM: {profile.sim.simNumber}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {profile.callerNumber}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <div className={`w-4 h-4 rounded-full border-2 transition-colors ${
                                  selected ? 'border-indigo-400 bg-indigo-400' : 'border-white/20'
                                }`} />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Field>

              {/* Calling Parameters */}
              <div className="rounded-xl border border-white/5 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-4">Calling Parameters</p>
                <FieldRow cols={3}>
                  <Field label={`Concurrent Calls (${form.concurrentCalls})`} hint="Max simultaneous outgoing calls">
                    <Slider
                      value={[form.concurrentCalls ?? 2]}
                      onValueChange={([v]) => setField('concurrentCalls', v)}
                      min={1} max={10} step={1}
                      className="mt-2"
                    />
                  </Field>
                  <Field label={`Retry Attempts (${form.maxRetries})`}>
                    <Slider
                      value={[form.maxRetries ?? 3]}
                      onValueChange={([v]) => setField('maxRetries', v)}
                      min={0} max={10} step={1}
                      className="mt-2"
                    />
                  </Field>
                  <Field label={`Call Delay (${form.callDelay}s)`} hint="Seconds between each call dispatch">
                    <Slider
                      value={[form.callDelay ?? 5]}
                      onValueChange={([v]) => setField('callDelay', v)}
                      min={1} max={60} step={1}
                      className="mt-2"
                    />
                  </Field>
                </FieldRow>
                <FieldRow cols={3}>
                  <Field label="Retry Delay (seconds)">
                    <Input
                      type="number"
                      value={form.retryDelay ?? 300}
                      onChange={(e) => setField('retryDelay', Number(e.target.value))}
                      min={30} max={3600}
                      className="h-9 text-sm border-white/10 bg-white/[0.04] text-white"
                    />
                  </Field>
                </FieldRow>
              </div>

              {/* Recording & Detection */}
              <div className="rounded-xl border border-white/5 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-4">Recording & Detection</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  { [
                    { key: 'enableRecording', label: 'Recording' },
                    { key: 'enableTranscript', label: 'Transcript' },
                    { key: 'enableAmd', label: 'AMD' },
                    { key: 'voicemailDetection', label: 'Voicemail Detect' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={!!(form.settings as any)?.[key]}
                        onCheckedChange={(v) => setSetting(key, v)}
                      />
                      <span className="text-xs text-white/50">{label}</span>
                    </div>
                  )) }
                </div>
              </div>
            </Section>

            {/* ── Section 4: Contact Source ─────────────────────────────────── */}
            <Section
              id="section-contacts"
              title="Contact Source"
              subtitle="Upload CSV or XLSX — contacts are automatically validated and imported"
              icon={<Users className="w-4 h-4" />}
              isOpen={openSections.contacts}
              isComplete={contactsComplete}
              hasError={!!errors.contactFile}
              onToggle={() => toggleSection('contacts')}
              badge={uploadStatus?.validRows ? `${uploadStatus.validRows} contacts` : undefined}
            >
              {errors.contactFile && (
                <div className="flex items-center gap-2 text-xs text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {errors.contactFile}
                </div>
              )}

              <UploadDropZone
                file={contactFile}
                onFile={handleFileSelected}
                uploadStatus={uploadStatus}
              />

              <div className="rounded-xl border border-white/5 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-xs text-white/30 leading-relaxed">
                  <strong className="text-white/50">Required columns:</strong> firstName, lastName, phone
                  <br />
                  <strong className="text-white/50">Optional columns:</strong> email, countryCode, language, city, state, country
                  <br />
                  Duplicate phone numbers within the same campaign are automatically removed. Invalid numbers are skipped.
                </p>
              </div>
            </Section>

          </div>

          {/* Right — Summary sticky panel */}
          <div className="space-y-4">
            <div className="xl:sticky xl:top-24 space-y-4">
              <SummaryPanel
                form={form}
                telephonyProfiles={telephonyProfiles}
                aiAgents={aiAgents}
                voices={voices}
                uploadStatus={uploadStatus}
              />

              {/* Quick Action Buttons (duplicate for easy access) */}
              <div className="space-y-2">
                <Button
                  onClick={handleStartCampaign}
                  disabled={saving || starting}
                  className="w-full h-11 font-semibold text-sm"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}
                >
                  {starting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Launching…</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2 fill-current" />Start Campaign</>
                  )}
                </Button>
                <Button
                  onClick={handleSaveDraft}
                  disabled={saving || starting}
                  variant="outline"
                  className="w-full h-10 text-sm border-white/10 text-white/60 hover:text-white/80 hover:bg-white/5"
                >
                  {saving ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Saving…</>
                  ) : (
                    <><Save className="w-3.5 h-3.5 mr-2" />Save as Draft</>
                  )}
                </Button>
              </div>

              {/* Section nav */}
              <div className="rounded-xl border border-white/5 overflow-hidden" style={{ background: 'rgba(15,15,25,0.7)' }}>
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-xs font-medium text-white/40 uppercase tracking-wide">Sections</p>
                </div>
                {[
                  { key: 'info', label: 'Campaign Information', complete: infoComplete },
                  { key: 'ai', label: 'AI Configuration', complete: aiComplete },
                  { key: 'telephony', label: 'Telephony', complete: telephonyComplete },
                  { key: 'contacts', label: 'Contact Source', complete: contactsComplete },
                ].map(({ key, label, complete }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setOpenSections((prev) => ({ ...prev, [key]: true }));
                      document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group"
                  >
                    <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">{label}</span>
                    {complete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
