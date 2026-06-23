package com.focusmeet.meetings.service;

import com.focusmeet.common.exception.ResourceNotFoundException;
import com.focusmeet.meetings.entity.Meeting;
import com.focusmeet.meetings.entity.Meeting.MeetingStatus;
import com.focusmeet.meetings.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Business logic for meeting lifecycle management.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MeetingService {

    private final MeetingRepository meetingRepository;

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Create a new meeting in SCHEDULED status.
     *
     * @param userId the authenticated user's UUID
     * @param title  meeting title (e.g. "Meeting — 2026-06-23 18:07")
     * @return the saved Meeting entity
     */
    @Transactional
    public Meeting createMeeting(UUID userId, String title) {
        Meeting meeting = Meeting.builder()
                .userId(userId)
                .title(title)
                .status(MeetingStatus.SCHEDULED)
                .build();
        Meeting saved = meetingRepository.save(meeting);
        log.info("Created meeting {} for user {}", saved.getId(), userId);
        return saved;
    }

    // ── Status update ─────────────────────────────────────────────────────────

    /**
     * Update the status of an existing meeting.
     *
     * @param meetingId the meeting UUID
     * @param status    the new status
     * @return the updated Meeting entity
     */
    @Transactional
    public Meeting updateStatus(UUID meetingId, MeetingStatus status) {
        Meeting meeting = findOrThrow(meetingId);
        meeting.setStatus(status);
        Meeting saved = meetingRepository.save(meeting);
        log.info("Meeting {} status changed to {}", meetingId, status);
        return saved;
    }

    // ── Save transcript ───────────────────────────────────────────────────────

    /**
     * Persist the final transcript and mark the meeting as COMPLETED.
     *
     * @param meetingId       the meeting UUID
     * @param transcript      full transcript text
     * @param durationSeconds recording duration in seconds
     * @return the updated Meeting entity
     */
    @Transactional
    public Meeting saveTranscript(UUID meetingId, String transcript, Integer durationSeconds) {
        Meeting meeting = findOrThrow(meetingId);
        meeting.setTranscript(transcript);
        meeting.setDurationSeconds(durationSeconds);
        meeting.setStatus(MeetingStatus.COMPLETED);
        Meeting saved = meetingRepository.save(meeting);
        log.info("Saved transcript for meeting {} ({} seconds)", meetingId, durationSeconds);
        return saved;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private Meeting findOrThrow(UUID meetingId) {
        return meetingRepository.findById(meetingId)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting", "id", meetingId));
    }
}
