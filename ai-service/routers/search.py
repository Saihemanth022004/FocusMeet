"""
Search router — semantic search over past meeting transcripts using pgvector + sentence-transformers.
Endpoints will be implemented in a future sprint.
"""

from fastapi import APIRouter

router = APIRouter()


# ── Placeholder endpoints ──────────────────────────────────────────────────

@router.get("/", summary="Search router status")
async def search_status() -> dict:
    """Placeholder — search endpoints coming soon."""
    return {"router": "search", "status": "ready for implementation"}


# TODO: GET /?q={query}&limit={n} — semantic search across all meetings
# TODO: GET /{meeting_id}?q={query} — search within a specific meeting
