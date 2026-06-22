"""
Transcription router — real-time audio transcription via faster-whisper.

Architecture:
  - Socket.IO server handles the real-time binary audio streaming.
  - HTTP router is kept for REST status / health endpoints.
  - Whisper inference runs in a thread-pool executor so it never blocks
    the asyncio event loop.
"""

import asyncio
import logging
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor

import socketio
from fastapi import APIRouter
from faster_whisper import WhisperModel

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── HTTP router (REST endpoints) ───────────────────────────────────────────

router = APIRouter()


@router.get("/", summary="Transcription router status")
async def transcribe_status() -> dict:
    """Returns the status of the transcription service."""
    return {"router": "transcribe", "status": "ok", "model": settings.whisper_model_size}


# ── Whisper model (loaded once, shared across connections) ─────────────────

_whisper_model: WhisperModel | None = None
_whisper_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="whisper")


def _get_whisper_model() -> WhisperModel:
    """Lazy-load and cache the WhisperModel singleton."""
    global _whisper_model
    if _whisper_model is None:
        logger.info(
            "Loading faster-whisper model '%s' on device '%s'…",
            settings.whisper_model_size,
            settings.whisper_device,
        )
        _whisper_model = WhisperModel(
            settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type="int8",  # good balance of speed / accuracy on CPU
        )
        logger.info("faster-whisper model loaded successfully.")
    return _whisper_model


def _transcribe_file_sync(path: str) -> str:
    """
    Synchronous transcription — called from a thread-pool executor.
    Returns the full transcript text.
    """
    model = _get_whisper_model()
    segments, _info = model.transcribe(
        path,
        beam_size=5,
        vad_filter=True,           # skip silence
        vad_parameters={"min_silence_duration_ms": 300},
    )
    return " ".join(seg.text.strip() for seg in segments).strip()


# ── Socket.IO server ───────────────────────────────────────────────────────

# CORS origins mirror the FastAPI CORS config so the browser can connect.
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.allowed_origins,
    logger=False,
    engineio_logger=False,
    max_http_buffer_size=10 * 1024 * 1024,   # 10 MB — enough for a 3-s webm chunk
    ping_timeout=60,
    ping_interval=25,
)

# Per-connection state: maps sid → {"buffer": bytearray, "tmp_path": str}
_sessions: dict[str, dict] = {}


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None) -> None:
    """Client connected — initialise an empty audio buffer."""
    logger.info("[transcribe] Client connected: %s", sid)
    fd, tmp_path = tempfile.mkstemp(suffix=".webm", prefix="focusmeet_")
    os.close(fd)
    _sessions[sid] = {"buffer": bytearray(), "tmp_path": tmp_path}


@sio.event
async def disconnect(sid: str) -> None:
    """Client disconnected — clean up temp file and session state."""
    logger.info("[transcribe] Client disconnected: %s", sid)
    session = _sessions.pop(sid, None)
    if session:
        _cleanup_temp(session["tmp_path"])


# ── Binary audio chunk handler ─────────────────────────────────────────────

@sio.on("*")
async def catch_all(event: str, sid: str, *args) -> None:
    """
    Route binary audio chunks and named events.

    Socket.IO sends binary data as a plain 'message' event with bytes payload,
    but our client emits it directly — we handle both patterns here.
    """
    # The client emits binary data without an explicit event name, which
    # socket.io-client maps to the default 'message' event.
    pass  # handled by dedicated handlers below


@sio.on("audio_chunk")
async def on_audio_chunk(sid: str, data: bytes) -> None:
    """
    Receive a binary audio chunk, append it to the buffer, and run an
    incremental transcription pass so the user sees rolling text.
    """
    session = _sessions.get(sid)
    if session is None:
        logger.warning("[transcribe] Received chunk for unknown sid: %s", sid)
        return

    session["buffer"] += data
    tmp_path = session["tmp_path"]

    # Write the accumulated buffer to the temp file (overwrite each time)
    try:
        with open(tmp_path, "wb") as f:
            f.write(session["buffer"])
    except OSError as exc:
        logger.error("[transcribe] Failed to write temp file: %s", exc)
        await sio.emit("error", {"message": "Server failed to write audio buffer."}, to=sid)
        return

    # Skip if the buffer is too small to contain useful audio (< 8 KB)
    if len(session["buffer"]) < 8_192:
        return

    # Run whisper in the executor — non-blocking
    try:
        loop = asyncio.get_running_loop()
        text = await loop.run_in_executor(
            _whisper_executor, _transcribe_file_sync, tmp_path
        )
        if text:
            logger.debug("[transcribe] Chunk transcript for %s: %r", sid, text[:80])
            await sio.emit("transcript_chunk", {"text": text, "is_final": False}, to=sid)
    except Exception as exc:
        logger.exception("[transcribe] Whisper inference error for %s: %s", sid, exc)
        await sio.emit(
            "error",
            {"message": f"Transcription error: {exc}"},
            to=sid,
        )


@sio.on("end_meeting")
async def on_end_meeting(sid: str, data: dict | None = None) -> None:
    """
    Final transcription pass over the complete accumulated audio buffer.
    Emits 'meeting_complete' with the full transcript text.
    """
    session = _sessions.get(sid)
    if session is None:
        logger.warning("[transcribe] end_meeting for unknown sid: %s", sid)
        return

    tmp_path = session["tmp_path"]

    if not session["buffer"]:
        await sio.emit(
            "meeting_complete",
            {"text": "", "message": "No audio was recorded."},
            to=sid,
        )
        return

    # Ensure the temp file has the latest buffer
    try:
        with open(tmp_path, "wb") as f:
            f.write(session["buffer"])
    except OSError as exc:
        logger.error("[transcribe] Failed to write temp file on end_meeting: %s", exc)
        await sio.emit("error", {"message": "Server failed to finalise audio."}, to=sid)
        return

    # Final full-file transcription
    try:
        loop = asyncio.get_running_loop()
        text = await loop.run_in_executor(
            _whisper_executor, _transcribe_file_sync, tmp_path
        )
        logger.info("[transcribe] Meeting complete for %s — %d chars", sid, len(text))
        await sio.emit("meeting_complete", {"text": text}, to=sid)
    except Exception as exc:
        logger.exception("[transcribe] Final transcription error for %s: %s", sid, exc)
        await sio.emit(
            "error",
            {"message": f"Final transcription failed: {exc}"},
            to=sid,
        )
    finally:
        _cleanup_temp(tmp_path)
        # Reset buffer so a new meeting can start on the same connection
        session["buffer"] = bytearray()
        fd, new_path = tempfile.mkstemp(suffix=".webm", prefix="focusmeet_")
        os.close(fd)
        session["tmp_path"] = new_path


# ── ASGI app (mounted in main.py) ──────────────────────────────────────────

# This is the Socket.IO ASGI app that wraps the raw Socket.IO server.
# It is mounted at "/" in the composite app defined in main.py.
socket_app = socketio.ASGIApp(sio, socketio_path="/socket.io")


# ── Helpers ────────────────────────────────────────────────────────────────

def _cleanup_temp(path: str) -> None:
    """Silently delete a temp file."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError as exc:
        logger.warning("[transcribe] Could not delete temp file %s: %s", path, exc)
