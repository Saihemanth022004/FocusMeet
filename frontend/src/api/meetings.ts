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
