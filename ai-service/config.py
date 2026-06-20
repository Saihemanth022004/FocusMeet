"""
FocusMeet AI Service — Configuration
Reads all settings from environment variables with sensible dev defaults.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ────────────────────────────────────────────────────────────────
    app_name: str = "FocusMeet AI Service"
    debug: bool = False

    # ── CORS ───────────────────────────────────────────────────────────────
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── Database ───────────────────────────────────────────────────────────
    database_url: str = "postgresql://focusmeet:focusmeet_secret@localhost:5432/focusmeet"

    # ── Redis ──────────────────────────────────────────────────────────────
    redis_host: str = "localhost"
    redis_port: int = 6379

    # ── Gemini ─────────────────────────────────────────────────────────────
    gemini_api_key: str = ""

    # ── Whisper ────────────────────────────────────────────────────────────
    whisper_model_size: str = "base"  # tiny | base | small | medium | large-v3
    whisper_device: str = "cpu"       # cpu | cuda

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (singleton)."""
    return Settings()
