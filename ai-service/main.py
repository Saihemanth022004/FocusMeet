"""
FocusMeet AI Service — Main Application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import transcribe, summarize, search, ask

settings = get_settings()

# ── Application factory ────────────────────────────────────────────────────

app = FastAPI(
    title=settings.app_name,
    description="AI-powered meeting transcription, summarization, search, and Q&A service.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS middleware ────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────

app.include_router(transcribe.router, prefix="/api/transcribe", tags=["transcribe"])
app.include_router(summarize.router, prefix="/api/summarize", tags=["summarize"])
app.include_router(search.router,    prefix="/api/search",    tags=["search"])
app.include_router(ask.router,       prefix="/api/ask",       tags=["ask"])

# ── Health check ───────────────────────────────────────────────────────────

@app.get("/health", tags=["health"], summary="Health check")
async def health() -> dict:
    """Returns service status. Used by load balancers and monitoring."""
    from datetime import datetime, timezone
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": settings.app_name,
    }
