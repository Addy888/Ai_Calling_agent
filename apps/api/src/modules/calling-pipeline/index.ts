/**
 * Calling Pipeline Module - Public API
 * Export all public interfaces, services, DTOs, enums, and exceptions
 */

// Module
export { CallingPipelineModule } from './calling-pipeline.module';

// Services
export { CallingPipelineService } from './services/calling-pipeline.service';
export { CallOrchestratorService } from './services/call-orchestrator.service';
export { ConversationOrchestratorService } from './services/conversation-orchestrator.service';
export { CampaignExecutionService } from './services/campaign-execution.service';
export { CallLifecycleService } from './services/call-lifecycle.service';
export { ConversationStateService } from './services/conversation-state.service';
export { AgentExecutionService } from './services/agent-execution.service';
export { QueueExecutionService } from './services/queue-execution.service';
export { CallSessionService } from './services/call-session.service';
export { WorkflowManagerService } from './services/workflow-manager.service';
export { PipelineContextService } from './services/pipeline-context.service';

// DTOs
export {
  StartCampaignDto,
  PauseCampaignDto,
  ResumeCampaignDto,
  StopCampaignDto,
  StartCallDto,
  EndCallDto,
  ProcessSpeechDto,
  CampaignStatusResponse,
  CallStatusResponse,
  ActiveCallsResponse,
  PipelineStatusResponse,
} from './dto/pipeline.dto';

// Enums
export {
  CallState,
  CampaignState,
  ConversationState,
  PipelineEvent,
  CallDirection,
  CallResult,
} from './enums/call-state.enum';

// Provider Interfaces
export {
  ISpeechToTextProvider,
  STTConfig,
  STTResult,
  ITextToSpeechProvider,
  TTSConfig,
  TTSOptions,
  TTSResult,
  Voice,
  ITelephonyProvider,
  TelephonyConfig,
  MakeCallParams,
  CallSession as TelephonyCallSession,
  CallStatus,
  TelephonyEvent,
  CallEventData,
} from './interfaces/provider.interfaces';

// Session Interface
export { CallSession, TranscriptTurn } from './services/call-session.service';

// Queue Interface
export { QueuedCall } from './services/queue-execution.service';

// Workflow Interfaces
export {
  WorkflowDefinition,
  WorkflowStep,
} from './services/workflow-manager.service';

// Exceptions
export {
  PipelineException,
  CampaignException,
  CampaignNotFoundException,
  CampaignAlreadyRunningException,
  CallException,
  CallNotFoundException,
  CallAlreadyActiveException,
  InvalidCallStateException,
  ConversationException,
  ConversationNotActiveException,
  InvalidConversationStateException,
  SessionException,
  SessionNotFoundException,
  SessionCreationFailedException,
  RuntimeException,
  AgentExecutionException,
  PromptGenerationException,
  KnowledgeRetrievalException,
  MemoryUpdateException,
  QueueException,
  QueueFullException,
  CallAlreadyQueuedException,
  ProviderException,
  STTProviderException,
  TTSProviderException,
  TelephonyProviderException,
  WorkflowException,
  WorkflowNotFoundException,
  InvalidWorkflowTransitionException,
  ContactException,
  ContactNotFoundException,
  InvalidPhoneNumberException,
  TimeoutException,
  RateLimitException,
} from './exceptions/pipeline.exceptions';
