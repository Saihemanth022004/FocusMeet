/**
 * Typed API helpers for the meetings resource.
 * All calls automatically carry the JWT via the axios interceptor in axios.ts.
 */

import api from './axios';

// ── Types ──────────────────────────────────────────────────────────────────

export interface MeetingListItem {
  id: string;
  title: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  createdAt: string;
  durationSeconds: number | null;
}

export interface MeetingDetail {
  id: string;
  title: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  transcript: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export type ActionItemStatus = 'PENDING' | 'DONE';

export interface ActionItem {
  id: string;
  meetingId: string;
  text: string;
  owner: string;
  dueDate: string | null; // "YYYY-MM-DD"
  status: ActionItemStatus;
}

export interface SummaryResult {
  meetingId: string;
  summary: string;
  decisions: string[];
  topics: string[];
  actionItems: Array<{ text: string; owner: string; dueDate: string | null }>;
  savedActionItems: ActionItem[];
}

// ── API calls ──────────────────────────────────────────────────────────────

/** POST /api/meetings — create a new meeting, returns the full meeting entity */
export async function createMeeting(title: string): Promise<MeetingDetail> {
  const res = await api.post<{ data: MeetingDetail }>('/api/meetings', { title });
  return res.data.data;
}

/**
 * PATCH /api/meetings/{id}/transcript
 * Saves the full transcript text and duration, marks meeting COMPLETED.
 */
export async function saveTranscript(
  meetingId: string,
  transcript: string,
  durationSeconds: number,
): Promise<MeetingDetail> {
  const res = await api.patch<{ data: MeetingDetail }>(
    `/api/meetings/${meetingId}/transcript`,
    { transcript, durationSeconds },
  );
  return res.data.data;
}

/** GET /api/meetings — list all meetings for the authenticated user */
export async function listMeetings(): Promise<MeetingListItem[]> {
  const res = await api.get<{ data: MeetingListItem[] }>('/api/meetings');
  return res.data.data ?? [];
}

/** GET /api/meetings/{id} — fetch full meeting detail including transcript */
export async function getMeeting(id: string): Promise<MeetingDetail> {
  const res = await api.get<{ data: MeetingDetail }>(`/api/meetings/${id}`);
  return res.data.data;
}

/**
 * POST /api/meetings/{id}/summarize
 * Calls FastAPI via Spring Boot, persists AI results, returns structured summary.
 */
export async function generateSummary(meetingId: string): Promise<SummaryResult> {
  const res = await api.post<{ data: SummaryResult }>(
    `/api/meetings/${meetingId}/summarize`,
  );
  return res.data.data;
}

/** GET /api/meetings/{id}/action-items — list action items for a meeting */
export async function getActionItems(meetingId: string): Promise<ActionItem[]> {
  const res = await api.get<{ data: ActionItem[] }>(
    `/api/meetings/${meetingId}/action-items`,
  );
  return res.data.data ?? [];
}

/**
 * PATCH /api/action-items/{id}/status
 * Toggle action item between PENDING and DONE.
 */
export async function updateActionItemStatus(
  itemId: string,
  status: ActionItemStatus,
): Promise<ActionItem> {
  const res = await api.patch<{ data: ActionItem }>(
    `/api/action-items/${itemId}/status`,
    { status },
  );
  return res.data.data;
}
