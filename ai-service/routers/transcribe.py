"""
Transcription router — real-time audio transcription via faster-whisper.
Endpoints will be implemented in a future sprint.
"""

from fastapi import APIRouter

router = APIRouter()


# ── Placeholder endpoints ──────────────────────────────────────────────────

@router.get("/", summary="Transcription router status")
async def transcribe_status() -> dict:
    """Placeholder — transcription endpoints coming soon."""
    return {"router": "transcribe", "status": "ready for implementation"}


# TODO: POST /  — upload audio file, return transcript
# TODO: WebSocket /ws/{meeting_id} — stream real-time transcript chunks
