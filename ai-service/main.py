"""
FocusMeet AI Service — Main Application

Architecture:
  - FastAPI handles REST API routes (HTTP).
  - python-socketio's ASGIApp handles the Socket.IO WebSocket transport,
    mounted at the root so the browser client can connect to ws://host/socket.io.
  - The two ASGI apps are composed using socketio.ASGIApp which forwards
    non-socket requests to FastAPI.
"""

import logging

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import transcribe, summarize, search, ask
from routers.transcribe import sio  # shared Socket.IO server instance

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

# ── FastAPI application ────────────────────────────────────────────────────

fastapi_app = FastAPI(
    title=settings.app_name,
    description="AI-powered meeting transcription, summarization, search, and Q&A service.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS middleware ────────────────────────────────────────────────────────

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────

fastapi_app.include_router(transcribe.router, prefix="/api/transcribe", tags=["transcribe"])
fastapi_app.include_router(summarize.router,  prefix="/api/summarize",  tags=["summarize"])
fastapi_app.include_router(search.router,     prefix="/api/search",     tags=["search"])
fastapi_app.include_router(ask.router,        prefix="/api/ask",        tags=["ask"])

# ── Health check ───────────────────────────────────────────────────────────

@fastapi_app.get("/health", tags=["health"], summary="Health check")
async def health() -> dict:
    """Returns service status. Used by load balancers and monitoring."""
    from datetime import datetime, timezone
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": settings.app_name,
    }


# ── Composite ASGI app (Socket.IO wraps FastAPI) ───────────────────────────
#
# socketio.ASGIApp routes requests as follows:
#   • Paths starting with /socket.io  → Socket.IO engine
#   • Everything else                 → FastAPI (other_asgi_app)
#
# This means:
#   ws://localhost:8000/socket.io      → Socket.IO WebSocket handshake
#   http://localhost:8000/api/...      → FastAPI REST endpoints
#   http://localhost:8000/docs         → FastAPI Swagger UI

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="/socket.io")
