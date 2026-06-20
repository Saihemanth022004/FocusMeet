"""
Summarization router — generates meeting summaries and action items via Gemini API.
Endpoints will be implemented in a future sprint.
"""

from fastapi import APIRouter

router = APIRouter()


# ── Placeholder endpoints ──────────────────────────────────────────────────

@router.get("/", summary="Summarization router status")
async def summarize_status() -> dict:
    """Placeholder — summarization endpoints coming soon."""
    return {"router": "summarize", "status": "ready for implementation"}


# TODO: POST /{meeting_id} — summarize a completed meeting transcript
# TODO: POST /{meeting_id}/action-items — extract action items from transcript
