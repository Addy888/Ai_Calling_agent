import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base Pipeline Exception
 */
export class PipelineException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(
      {
        statusCode: status,
        error: 'Pipeline Error',
        message,
      },
      status,
    );
  }
}

/**
 * Campaign Exception
 */
export class CampaignException extends PipelineException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
    this.name = 'CampaignException';
  }
}

/**
 * Campaign Not Found Exception
 */
export class CampaignNotFoundException extends CampaignException {
  constructor(campaignId: string) {
    super(`Campaign not found: ${campaignId}`, HttpStatus.NOT_FOUND);
    this.name = 'CampaignNotFoundException';
  }
}

/**
 * Campaign Already Running Exception
 */
export class CampaignAlreadyRunningException extends CampaignException {
  constructor(campaignId: string) {
    super(`Campaign is already running: ${campaignId}`, HttpStatus.CONFLICT);
    this.name = 'CampaignAlreadyRunningException';
  }
}

/**
 * Call Exception
 */
export class CallException extends PipelineException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
    this.name = 'CallException';
  }
}

/**
 * Call Not Found Exception
 */
export class CallNotFoundException extends CallException {
  constructor(sessionId: string) {
    super(`Call session not found: ${sessionId}`, HttpStatus.NOT_FOUND);
    this.name = 'CallNotFoundException';
  }
}

/**
 * Call Already Active Exception
 */
export class CallAlreadyActiveException extends CallException {
  constructor(contactId: string) {
    super(`Call already active for contact: ${contactId}`, HttpStatus.CONFLICT);
    this.name = 'CallAlreadyActiveException';
  }
}

/**
 * Invalid Call State Exception
 */
export class InvalidCallStateException extends CallException {
  constructor(currentState: string, attemptedAction: string) {
    super(
      `Cannot perform ${attemptedAction} in state: ${currentState}`,
      HttpStatus.BAD_REQUEST,
    );
    this.name = 'InvalidCallStateException';
  }
}

/**
 * Conversation Exception
 */
export class ConversationException extends PipelineException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
    this.name = 'ConversationException';
  }
}

/**
 * Conversation Not Active Exception
 */
export class ConversationNotActiveException extends ConversationException {
  constructor(sessionId: string) {
    super(`Conversation not active for session: ${sessionId}`, HttpStatus.BAD_REQUEST);
    this.name = 'ConversationNotActiveException';
  }
}

/**
 * Invalid Conversation State Exception
 */
export class InvalidConversationStateException extends ConversationException {
  constructor(currentState: string, attemptedAction: string) {
    super(
      `Cannot perform ${attemptedAction} in conversation state: ${currentState}`,
      HttpStatus.BAD_REQUEST,
    );
    this.name = 'InvalidConversationStateException';
  }
}

/**
 * Session Exception
 */
export class SessionException extends PipelineException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
    this.name = 'SessionException';
  }
}

/**
 * Session Not Found Exception
 */
export class SessionNotFoundException extends SessionException {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, HttpStatus.NOT_FOUND);
    this.name = 'SessionNotFoundException';
  }
}

/**
 * Session Creation Failed Exception
 */
export class SessionCreationFailedException extends SessionException {
  constructor(reason: string) {
    super(`Failed to create session: ${reason}`, HttpStatus.INTERNAL_SERVER_ERROR);
    this.name = 'SessionCreationFailedException';
  }
}

/**
 * Runtime Exception
 */
export class RuntimeException extends PipelineException {
  constructor(message: string, status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message, status);
    this.name = 'RuntimeException';
  }
}

/**
 * AI Agent Execution Exception
 */
export class AgentExecutionException extends RuntimeException {
  constructor(agentId: string, error: string) {
    super(`AI Agent execution failed for ${agentId}: ${error}`);
    this.name = 'AgentExecutionException';
  }
}

/**
 * Prompt Generation Exception
 */
export class PromptGenerationException extends RuntimeException {
  constructor(error: string) {
    super(`Prompt generation failed: ${error}`);
    this.name = 'PromptGenerationException';
  }
}

/**
 * Knowledge Retrieval Exception
 */
export class KnowledgeRetrievalException extends RuntimeException {
  constructor(error: string) {
    super(`Knowledge retrieval failed: ${error}`);
    this.name = 'KnowledgeRetrievalException';
  }
}

/**
 * Memory Update Exception
 */
export class MemoryUpdateException extends RuntimeException {
  constructor(error: string) {
    super(`Memory update failed: ${error}`);
    this.name = 'MemoryUpdateException';
  }
}

/**
 * Queue Exception
 */
export class QueueException extends PipelineException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
    this.name = 'QueueException';
  }
}

/**
 * Queue Full Exception
 */
export class QueueFullException extends QueueException {
  constructor(maxSize: number) {
    super(`Queue is full (max: ${maxSize})`, HttpStatus.SERVICE_UNAVAILABLE);
    this.name = 'QueueFullException';
  }
}

/**
 * Call Already Queued Exception
 */
export class CallAlreadyQueuedException extends QueueException {
  constructor(contactId: string) {
    super(`Call already queued for contact: ${contactId}`, HttpStatus.CONFLICT);
    this.name = 'CallAlreadyQueuedException';
  }
}

/**
 * Provider Exception
 */
export class ProviderException extends PipelineException {
  constructor(
    provider: 'STT' | 'TTS' | 'Telephony',
    message: string,
    status: HttpStatus = HttpStatus.SERVICE_UNAVAILABLE,
  ) {
    super(`${provider} Provider Error: ${message}`, status);
    this.name = 'ProviderException';
  }
}

/**
 * STT Provider Exception
 */
export class STTProviderException extends ProviderException {
  constructor(message: string) {
    super('STT', message);
    this.name = 'STTProviderException';
  }
}

/**
 * TTS Provider Exception
 */
export class TTSProviderException extends ProviderException {
  constructor(message: string) {
    super('TTS', message);
    this.name = 'TTSProviderException';
  }
}

/**
 * Telephony Provider Exception
 */
export class TelephonyProviderException extends ProviderException {
  constructor(message: string) {
    super('Telephony', message);
    this.name = 'TelephonyProviderException';
  }
}

/**
 * Workflow Exception
 */
export class WorkflowException extends PipelineException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
    this.name = 'WorkflowException';
  }
}

/**
 * Workflow Not Found Exception
 */
export class WorkflowNotFoundException extends WorkflowException {
  constructor(workflowId: string) {
    super(`Workflow not found: ${workflowId}`, HttpStatus.NOT_FOUND);
    this.name = 'WorkflowNotFoundException';
  }
}

/**
 * Invalid Workflow Transition Exception
 */
export class InvalidWorkflowTransitionException extends WorkflowException {
  constructor(fromStep: string, toStep: string) {
    super(
      `Invalid workflow transition: ${fromStep} -> ${toStep}`,
      HttpStatus.BAD_REQUEST,
    );
    this.name = 'InvalidWorkflowTransitionException';
  }
}

/**
 * Contact Exception
 */
export class ContactException extends PipelineException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
    this.name = 'ContactException';
  }
}

/**
 * Contact Not Found Exception
 */
export class ContactNotFoundException extends ContactException {
  constructor(contactId: string) {
    super(`Contact not found: ${contactId}`, HttpStatus.NOT_FOUND);
    this.name = 'ContactNotFoundException';
  }
}

/**
 * Invalid Phone Number Exception
 */
export class InvalidPhoneNumberException extends ContactException {
  constructor(phoneNumber: string) {
    super(`Invalid phone number: ${phoneNumber}`, HttpStatus.BAD_REQUEST);
    this.name = 'InvalidPhoneNumberException';
  }
}

/**
 * Timeout Exception
 */
export class TimeoutException extends PipelineException {
  constructor(operation: string, timeoutSeconds: number) {
    super(
      `Operation timed out: ${operation} (${timeoutSeconds}s)`,
      HttpStatus.REQUEST_TIMEOUT,
    );
    this.name = 'TimeoutException';
  }
}

/**
 * Rate Limit Exception
 */
export class RateLimitException extends PipelineException {
  constructor(resource: string, limit: number) {
    super(
      `Rate limit exceeded for ${resource}: ${limit} requests`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
    this.name = 'RateLimitException';
  }
}
