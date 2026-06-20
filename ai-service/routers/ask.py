"""
Ask router — natural-language Q&A over meeting content via Gemini API (RAG pipeline).
Endpoints will be implemented in a future sprint.
"""

from fastapi import APIRouter

router = APIRouter()


# ── Placeholder endpoints ──────────────────────────────────────────────────

@router.get("/", summary="Ask router status")
async def ask_status() -> dict:
    """Placeholder — Q&A endpoints coming soon."""
    return {"router": "ask", "status": "ready for implementation"}


# TODO: POST / — ask a natural-language question, get a grounded answer with citations
# TODO: POST /{meeting_id} — ask a question scoped to a specific meeting
