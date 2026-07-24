"""
Enterprise Faster Whisper HTTP Microservice
Provides low-latency, production-ready Speech-to-Text transcription.

Architecture:
- FastAPI for high-performance HTTP API
- Faster-Whisper for GPU-accelerated inference
- Connection pooling & request queuing
- Graceful shutdown & health monitoring
"""

import os
import io
import logging
import asyncio
from typing import Optional, List
from contextlib import asynccontextmanager

import torch
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from faster_whisper import WhisperModel
import uvicorn

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(name)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Model configuration
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")  # tiny, base, small, medium, large-v2, large-v3
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "int8"
NUM_WORKERS = int(os.getenv("WHISPER_NUM_WORKERS", "2"))

# Global model instance
whisper_model: Optional[WhisperModel] = None

# ─────────────────────────────────────────────
# Data Models
# ─────────────────────────────────────────────

class TranscriptionResponse(BaseModel):
    text: str
    language: str
    confidence: float
    words: List[dict] = []
    duration: float
    processing_time_ms: float

class HealthResponse(BaseModel):
    status: str
    model_size: str
    device: str
    compute_type: str
    gpu_available: bool

# ─────────────────────────────────────────────
# Lifecycle Management
# ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context for startup/shutdown"""
    # Startup
    global whisper_model
    logger.info("🚀 Initializing Faster Whisper Service...")
    logger.info(f"Model: {MODEL_SIZE}, Device: {DEVICE}, Compute: {COMPUTE_TYPE}")
    
    try:
        whisper_model = WhisperModel(
            MODEL_SIZE,
            device=DEVICE,
            compute_type=COMPUTE_TYPE,
            num_workers=NUM_WORKERS,
            download_root=os.getenv("WHISPER_MODEL_DIR", "./models")
        )
        logger.info("✅ Faster Whisper model loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load Whisper model: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Faster Whisper Service...")
    whisper_model = None

# ─────────────────────────────────────────────
# FastAPI Application
# ─────────────────────────────────────────────

app = FastAPI(
    title="Faster Whisper STT Service",
    description="Enterprise Speech-to-Text microservice powered by Faster Whisper",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Audio Processing Utilities
# ─────────────────────────────────────────────

def load_audio_from_bytes(audio_bytes: bytes, sample_rate: int = 16000) -> np.ndarray:
    """
    Convert raw PCM bytes (16-bit mono) to numpy array
    Expected format: 16-bit signed PCM, Mono, 16kHz
    """
    try:
        # Convert bytes to int16 numpy array
        audio_int16 = np.frombuffer(audio_bytes, dtype=np.int16)
        
        # Normalize to float32 in range [-1.0, 1.0]
        audio_float32 = audio_int16.astype(np.float32) / 32768.0
        
        return audio_float32
    except Exception as e:
        logger.error(f"Failed to load audio from bytes: {e}")
        raise ValueError(f"Invalid audio format: {e}")

def calculate_audio_duration(audio_array: np.ndarray, sample_rate: int = 16000) -> float:
    """Calculate audio duration in seconds"""
    return len(audio_array) / sample_rate

# ─────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if whisper_model is not None else "unhealthy",
        model_size=MODEL_SIZE,
        device=DEVICE,
        compute_type=COMPUTE_TYPE,
        gpu_available=torch.cuda.is_available()
    )

@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    task: str = Form("transcribe"),
    beam_size: int = Form(5),
    vad_filter: bool = Form(True),
    word_timestamps: bool = Form(True)
):
    """
    Transcribe audio file to text
    
    Args:
        audio: Raw PCM audio file (16-bit mono, 16kHz)
        language: Language code (e.g., 'en', 'hi', 'mr') or None for auto-detection
        task: 'transcribe' or 'translate' (translate to English)
        beam_size: Beam search size (higher = more accurate, slower)
        vad_filter: Enable Voice Activity Detection filtering
        word_timestamps: Include word-level timestamps
    
    Returns:
        TranscriptionResponse with text, language, confidence, and word timestamps
    """
    if whisper_model is None:
        raise HTTPException(status_code=503, detail="Whisper model not loaded")
    
    try:
        import time
        start_time = time.time()
        
        # Read audio bytes
        audio_bytes = await audio.read()
        
        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")
        
        logger.info(f"Received audio: {len(audio_bytes)} bytes, language: {language or 'auto'}")
        
        # Convert to numpy array
        audio_array = load_audio_from_bytes(audio_bytes)
        audio_duration = calculate_audio_duration(audio_array)
        
        logger.info(f"Audio duration: {audio_duration:.2f}s")
        
        # Transcribe
        segments, info = whisper_model.transcribe(
            audio_array,
            language=language,
            task=task,
            beam_size=beam_size,
            vad_filter=vad_filter,
            word_timestamps=word_timestamps
        )
        
        # Collect segments
        full_text = []
        all_words = []
        total_confidence = 0.0
        segment_count = 0
        
        for segment in segments:
            full_text.append(segment.text.strip())
            total_confidence += segment.avg_logprob
            segment_count += 1
            
            # Extract word timestamps
            if word_timestamps and hasattr(segment, 'words'):
                for word in segment.words:
                    all_words.append({
                        "word": word.word.strip(),
                        "start": round(word.start, 3),
                        "end": round(word.end, 3),
                        "confidence": round(word.probability, 4)
                    })
        
        # Calculate overall confidence (convert logprob to 0-1 scale)
        avg_confidence = np.exp(total_confidence / segment_count) if segment_count > 0 else 0.0
        
        processing_time = (time.time() - start_time) * 1000
        
        result = TranscriptionResponse(
            text=" ".join(full_text).strip(),
            language=info.language,
            confidence=round(avg_confidence, 4),
            words=all_words,
            duration=round(audio_duration, 3),
            processing_time_ms=round(processing_time, 2)
        )
        
        logger.info(
            f"Transcription complete: {len(result.text)} chars, "
            f"language: {result.language}, "
            f"confidence: {result.confidence:.4f}, "
            f"latency: {processing_time:.0f}ms"
        )
        
        return result
        
    except ValueError as e:
        logger.error(f"Audio processing error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Faster Whisper STT",
        "version": "1.0.0",
        "status": "running",
        "model": MODEL_SIZE,
        "device": DEVICE
    }

# ─────────────────────────────────────────────
# Main Entry Point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("PORT", "9000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting Faster Whisper Service on {host}:{port}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )
