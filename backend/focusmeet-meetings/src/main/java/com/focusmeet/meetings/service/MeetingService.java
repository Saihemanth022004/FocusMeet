package com.focusmeet.meetings.service;

import com.focusmeet.common.exception.ResourceNotFoundException;
import com.focusmeet.meetings.dto.ActionItemResponse;
import com.focusmeet.meetings.dto.SummarizeResponse;
import com.focusmeet.meetings.entity.ActionItem;
import com.focusmeet.meetings.entity.Meeting;
import com.focusmeet.meetings.entity.Meeting.MeetingStatus;
import com.focusmeet.meetings.repository.ActionItemRepository;
import com.focusmeet.meetings.repository.MeetingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Business logic for meeting lifecycle management.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final ActionItemRepository actionItemRepository;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

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

    // ── Summarize ────────────────────────────────────────────────────────────

    /**
     * Call the FastAPI AI service to summarize a meeting's transcript,
     * persist the results (summary, decisions, topics, action items), and return
     * a fully-populated response including saved ActionItem UUIDs.
     *
     * @param meetingId the UUID of the meeting to summarize
     * @return a {@link SummarizeResponse} with all AI fields and saved action items
     */
    @Transactional
    public SummarizeResponse summarizeMeeting(UUID meetingId) {
        Meeting meeting = findOrThrow(meetingId);

        if (meeting.getTranscript() == null || meeting.getTranscript().isBlank()) {
            throw new IllegalStateException("Meeting " + meetingId + " has no transcript to summarize.");
        }

        // ── Call FastAPI ────────────────────────────────────────────────────
        SummarizeResponse aiResult = aiService.summarize(meetingId, meeting.getTranscript());

        // ── Serialize decisions & topics as JSON arrays ────────────────────
        String decisionsJson = toJson(aiResult.getDecisions());
        String topicsJson    = toJson(aiResult.getTopics());

        // ── Persist AI fields on the Meeting ────────────────────────────
        meeting.setSummary(aiResult.getSummary());
        meeting.setDecisions(decisionsJson);
        meeting.setTopics(topicsJson);
        meetingRepository.save(meeting);

        // ── Replace action items (idempotent re-summarize support) ───────
        actionItemRepository.deleteByMeetingId(meetingId);

        List<ActionItem> savedItems = List.of();
        if (aiResult.getActionItems() != null) {
            List<ActionItem> toSave = aiResult.getActionItems().stream()
                    .map(dto -> ActionItem.builder()
                            .meetingId(meetingId)
                            .text(dto.getText())
                            .owner(dto.getOwner() != null ? dto.getOwner() : "Unassigned")
                            .dueDate(parseDueDate(dto.getDueDate()))
                            .build())
                    .toList();
            savedItems = actionItemRepository.saveAll(toSave);
        }

        log.info("Summarized meeting {} — {} action items saved", meetingId, savedItems.size());

        // ── Build complete response ───────────────────────────────────
        aiResult.setMeetingId(meetingId);
        aiResult.setSavedActionItems(
                savedItems.stream().map(ActionItemResponse::from).toList()
        );
        return aiResult;
    }

    // ── Internal helpers ────────────────────────────────────────────────

    private Meeting findOrThrow(UUID meetingId) {
        return meetingRepository.findById(meetingId)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting", "id", meetingId));
    }

    private String toJson(Object value) {
        if (value == null) return "[]";
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            log.warn("Failed to serialize value to JSON: {}", e.getMessage());
            return "[]";
        }
    }

    private LocalDate parseDueDate(String raw) {
        if (raw == null || raw.isBlank() || raw.equalsIgnoreCase("null")) return null;
        try {
            return LocalDate.parse(raw);
        } catch (Exception e) {
            log.warn("Could not parse due date '{}', setting to null", raw);
            return null;
        }
    }
}
