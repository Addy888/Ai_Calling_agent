/**
 * Conversation Runtime Enums
 * Defines all states and types for conversation management
 */

/**
 * Conversation State
 * Represents the current state of the conversation
 */
export enum ConversationState {
  INITIALIZING = 'initializing',
  GREETING = 'greeting',
  LISTENING = 'listening',
  THINKING = 'thinking',
  GENERATING_RESPONSE = 'generating_response',
  SPEAKING = 'speaking',
  WAITING = 'waiting',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Intent Type
 * Represents detected customer intents
 */
export enum IntentType {
  INTERESTED = 'interested',
  NOT_INTERESTED = 'not_interested',
  BUSY = 'busy',
  CALL_LATER = 'call_later',
  WRONG_NUMBER = 'wrong_number',
  REQUEST_INFORMATION = 'request_information',
  FAQ = 'faq',
  COMPLAINT = 'complaint',
  POSITIVE_RESPONSE = 'positive_response',
  NEGATIVE_RESPONSE = 'negative_response',
  UNKNOWN = 'unknown',
  GOODBYE = 'goodbye',
  AFFIRMATION = 'affirmation',
  DENIAL = 'denial',
  QUESTION = 'question',
}

/**
 * Speaker Type
 */
export enum SpeakerType {
  CUSTOMER = 'customer',
  AI = 'ai',
  SYSTEM = 'system',
}

/**
 * Message Role
 * For conversation history
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

/**
 * Conversation Events
 */
export enum ConversationEvent {
  STARTED = 'conversation.started',
  GREETING_COMPLETED = 'conversation.greeting.completed',
  CUSTOMER_SPEECH_RECEIVED = 'conversation.speech.received',
  INTENT_DETECTED = 'conversation.intent.detected',
  RESPONSE_GENERATED = 'conversation.response.generated',
  SPEECH_PLAYED = 'conversation.speech.played',
  SILENCE_DETECTED = 'conversation.silence.detected',
  ENDED = 'conversation.ended',
  TRANSCRIPT_SAVED = 'conversation.transcript.saved',
  ERROR = 'conversation.error',
  STATE_CHANGED = 'conversation.state.changed',
  MEMORY_UPDATED = 'conversation.memory.updated',
  KNOWLEDGE_RETRIEVED = 'conversation.knowledge.retrieved',
}

/**
 * Fallback Reason
 */
export enum FallbackReason {
  NO_KNOWLEDGE = 'no_knowledge',
  LOW_CONFIDENCE = 'low_confidence',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  UNCLEAR_INTENT = 'unclear_intent',
}

/**
 * Conversation End Reason
 */
export enum ConversationEndReason {
  COMPLETED = 'completed',
  CUSTOMER_HANGUP = 'customer_hangup',
  AI_HANGUP = 'ai_hangup',
  TIMEOUT = 'timeout',
  ERROR = 'error',
  TRANSFERRED = 'transferred',
  SILENCE_TIMEOUT = 'silence_timeout',
}
