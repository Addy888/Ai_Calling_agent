/**
 * Call State Enumeration
 * Represents all possible states of a call throughout its lifecycle
 */
export enum CallState {
  QUEUED = 'queued',
  DIALING = 'dialing',
  RINGING = 'ringing',
  ANSWERED = 'answered',
  TALKING = 'talking',
  BUSY = 'busy',
  NO_ANSWER = 'no_answer',
  FAILED = 'failed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RETRY = 'retry',
}

/**
 * Provider Type Enumeration
 */
export enum ProviderType {
  TWILIO = 'twilio',
  EXOTEL = 'exotel',
  PLIVO = 'plivo',
  SIP = 'sip',
  ASTERISK = 'asterisk',
  FREESWITCH = 'freeswitch',
}

/**
 * Call Direction Enumeration
 */
export enum CallDirection {
  OUTBOUND = 'outbound',
  INBOUND = 'inbound',
}

/**
 * Recording Status Enumeration
 */
export enum RecordingStatus {
  PENDING = 'pending',
  RECORDING = 'recording',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * DTMF Tone Enumeration
 */
export enum DTMFTone {
  DIGIT_0 = '0',
  DIGIT_1 = '1',
  DIGIT_2 = '2',
  DIGIT_3 = '3',
  DIGIT_4 = '4',
  DIGIT_5 = '5',
  DIGIT_6 = '6',
  DIGIT_7 = '7',
  DIGIT_8 = '8',
  DIGIT_9 = '9',
  STAR = '*',
  HASH = '#',
}
