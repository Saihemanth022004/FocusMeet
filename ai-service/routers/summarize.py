"""
Summarization router — generates meeting summaries and action items via Gemini API.

POST /api/summarize
    Body:  { "meetingId": str, "transcript": str }
    Returns the structured JSON produced by Gemini (summary, decisions,
    actionItems, topics) plus the original meetingId for correlation.
"""

import json
import logging

import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Prompt template ────────────────────────────────────────────────────────────

SUMMARIZE_PROMPT = """\
You are an expert meeting analyst. Analyze the following meeting transcript and return a JSON object with exactly these fields:
 {{
   "summary": "5-6 sentence paragraph summarizing the meeting",
   "decisions": ["decision 1", "decision 2", ...],
   "actionItems": [
     {{ "text": "action description", "owner": "person name or 'Unassigned'", "dueDate": "YYYY-MM-DD or null" }}
   ],
   "topics": ["topic1", "topic2", ...]
 }}
 Only return valid JSON. No markdown, no explanation.
 Transcript:
 {transcript}"""


# ── Request / Response models ─────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    meetingId: str
    transcript: str


class ActionItemOut(BaseModel):
    text: str
    owner: str
    dueDate: str | None = None


class SummarizeResult(BaseModel):
    meetingId: str
    summary: str
    decisions: list[str]
    actionItems: list[ActionItemOut]
    topics: list[str]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/", summary="Summarize a meeting transcript", response_model=SummarizeResult)
async def summarize_meeting(request: SummarizeRequest) -> SummarizeResult:
    """
    Call Gemini to produce a structured summary of the provided transcript.
    Returns summary, decisions, actionItems, and topics.
    """
    settings = get_settings()

    if not settings.gemini_api_key:
        logger.error("GEMINI_API_KEY is not configured")
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not set. Configure it in the environment before calling this endpoint.",
        )

    # ── Configure Gemini client ───────────────────────────────────────────────
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = SUMMARIZE_PROMPT.format(transcript=request.transcript)

    # ── Call Gemini ───────────────────────────────────────────────────────────
    try:
        response = model.generate_content(prompt)
        raw_text = response.text.strip()
    except Exception as exc:
        logger.exception("Gemini API call failed for meeting %s", request.meetingId)
        raise HTTPException(
            status_code=500,
            detail=f"Gemini API error: {exc}",
        ) from exc

    # ── Parse JSON response ───────────────────────────────────────────────────
    # Strip accidental markdown code fences that Gemini sometimes emits
    if raw_text.startswith("```"):
        lines = raw_text.splitlines()
        # Remove opening ``` line and closing ``` line
        raw_text = "\n".join(
            line for line in lines if not line.strip().startswith("```")
        )

    try:
        parsed: dict = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        logger.error(
            "Failed to parse Gemini JSON for meeting %s. Raw: %s",
            request.meetingId,
            raw_text[:500],
        )
        raise HTTPException(
            status_code=500,
            detail=f"Gemini returned invalid JSON: {exc}. Raw response (truncated): {raw_text[:300]}",
        ) from exc

    # ── Build and validate response ───────────────────────────────────────────
    try:
        result = SummarizeResult(
            meetingId=request.meetingId,
            summary=parsed.get("summary", ""),
            decisions=parsed.get("decisions", []),
            actionItems=[ActionItemOut(**item) for item in parsed.get("actionItems", [])],
            topics=parsed.get("topics", []),
        )
    except Exception as exc:
        logger.error("Response shape mismatch for meeting %s: %s", request.meetingId, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Gemini response shape mismatch: {exc}",
        ) from exc

    logger.info(
        "Summarized meeting %s — %d decisions, %d action items, %d topics",
        request.meetingId,
        len(result.decisions),
        len(result.actionItems),
        len(result.topics),
    )
    return result
