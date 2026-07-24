import { HttpException, HttpStatus } from '@nestjs/common';

export class SpeechRecognitionException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message, status);
  }
}

export class StreamingException extends SpeechRecognitionException {
  constructor(message: string) {
    super(`Streaming STT Error: ${message}`, HttpStatus.BAD_REQUEST);
  }
}

export class WhisperException extends SpeechRecognitionException {
  constructor(message: string) {
    super(`Whisper Engine Error: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class AudioException extends SpeechRecognitionException {
  constructor(message: string) {
    super(`Audio Processing Error: ${message}`, HttpStatus.BAD_REQUEST);
  }
}

export class LanguageDetectionException extends SpeechRecognitionException {
  constructor(message: string) {
    super(`Language Detection Error: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class TranscriptException extends SpeechRecognitionException {
  constructor(message: string) {
    super(`Transcript Assembly Error: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
