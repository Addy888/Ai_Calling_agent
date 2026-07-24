# Implementation Plan - Enterprise Streaming Speech-to-Text Engine (Phase 4.5.2)

We will build a high-performance, low-latency, real-time streaming Speech-to-Text (STT) engine featuring VAD (Voice Activity Detection), Noise Reduction, and support for plug-and-play providers (Faster Whisper as default, OpenAI Whisper API, NVIDIA Parakeet, Deepgram, Azure Speech, Google Speech).

## Proposed Changes

### [New Module] Speech Recognition Module (`apps/api/src/modules/speech-recognition`)

We will create a dedicated module containing the requested core classes:

#### [NEW] [speech-recognition.module.ts](file:///c:/Users/ADITYA/OneDrive/Desktop/Ai_calling_agent/apps/api/src/modules/speech-recognition/speech-recognition.module.ts)
Registers controllers and services, configures event emitters, and handles export configuration.

#### [NEW] [speech-recognition.controller.ts](file:///c:/Users/ADITYA/OneDrive/Desktop/Ai_calling_agent/apps/api/src/modules/speech-recognition/speech-recognition.controller.ts)
Exposes REST APIs:
- `POST /stt/start`: Initialize a transcription session.
- `POST /stt/stop`: Stop a transcription session.
- `POST /stt/stream`: Stream raw audio chunks.
- `GET /stt/status`: Get status of the STT engine.
- `GET /stt/sessions`: Retrieve active transcription sessions.
- `GET /stt/providers`: List available STT providers.

#### [NEW] [interfaces](file:///c:/Users/ADITYA/OneDrive/Desktop/Ai_calling_agent/apps/api/src/modules/speech-recognition/interfaces)
Interfaces for providers and speech events:
- `stt-provider.interface.ts`: Standard interface implemented by all STT providers.
- `speech-events.interface.ts`: Defines event structures for SpeechStarted, SpeechEnded, PartialTranscript, FinalTranscript, etc.

#### [NEW] [services](file:///c:/Users/ADITYA/OneDrive/Desktop/Ai_calling_agent/apps/api/src/modules/speech-recognition/services)
Implements core pipeline architecture:
- `whisper.manager.ts`: Wrapper manager handling Faster Whisper (default/mock/external client) and other speech recognition APIs (OpenAI Whisper, Deepgram, etc.).
- `voice-activity-detector.ts`: Custom VAD that processes raw audio power or simple envelope thresholds, recognizing speech start, speech end, pause thresholds, and silence.
- `noise-reduction-manager.ts`: Background noise filtering algorithms or spectral subtraction wrappers to sanitize audio signals.
- `speech-buffer-manager.ts`: Manages ring buffers/sliding window memory segments of audio bytes for speech segmentation.
- `audio-chunk-processor.ts`: Processes incoming raw PCM streams, invokes noise reduction, and queues audio into VAD logic.
- `language-detector.ts`: Detects English, Hindi, and Hinglish.
- `transcript-assembler.ts`: Reconstructs partial and final transcripts with timestamps and word confidence scores.
- `transcription-session-manager.ts`: Holds session context and maps incoming streams to callers.
- `speech-recognition-manager.ts`: Entry point manager exposing high-level module control.
- `streaming-speech-engine.ts`: Manages actual WebSockets/Stream handlers, orchestrates VAD -> Segment -> Transcribe cycle.
- `speech-runtime-manager.ts`: Manages active per-call runtime event emitter coordination.

#### [NEW] [exceptions](file:///c:/Users/ADITYA/OneDrive/Desktop/Ai_calling_agent/apps/api/src/modules/speech-recognition/exceptions)
Custom typed STT exceptions:
- `speech-recognition.exception.ts` (Includes subclass exceptions: `StreamingException`, `WhisperException`, `AudioException`, `LanguageDetectionException`, `TranscriptException`).

### [Modify] API App Module (`apps/api/src/app.module.ts`)

#### [MODIFY] [app.module.ts](file:///c:/Users/ADITYA/OneDrive/Desktop/Ai_calling_agent/apps/api/src/app.module.ts)
Register `SpeechRecognitionModule` in NestJS root imports.

## Verification Plan

### Automated Tests
We will add standard NestJS unit and integration tests inside `apps/api/src/modules/speech-recognition/tests`:
- `whisper-manager.spec.ts`
- `voice-activity-detector.spec.ts`
- `audio-chunk-processor.spec.ts`
- `streaming-speech-engine.spec.ts`

### Manual Verification
Validate STT APIs using mock HTTP calls to start sessions, send test PCM chunks, and check transcript assembling correctness.
