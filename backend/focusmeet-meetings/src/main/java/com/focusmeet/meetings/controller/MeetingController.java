package com.focusmeet.meetings.controller;

import com.focusmeet.common.dto.ApiResponse;
import com.focusmeet.meetings.dto.CreateMeetingRequest;
import com.focusmeet.meetings.dto.MeetingListResponse;
import com.focusmeet.meetings.dto.SaveTranscriptRequest;
import com.focusmeet.meetings.entity.Meeting;
import com.focusmeet.meetings.repository.MeetingRepository;
import com.focusmeet.meetings.service.MeetingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;
    private final MeetingRepository meetingRepository;

    // ── List meetings ─────────────────────────────────────────────────────────

    /**
     * GET /api/meetings
     * Returns a slim list (no transcript) of all meetings for the authenticated user,
     * ordered newest first.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<MeetingListResponse>>> listMeetings(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        List<MeetingListResponse> meetings = meetingRepository
                .findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(MeetingListResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(meetings));
    }

    // ── Get meeting detail ────────────────────────────────────────────────────

    /**
     * GET /api/meetings/{id}
     * Returns the full meeting including transcript.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Meeting>> getMeeting(@PathVariable UUID id) {
        Meeting meeting = meetingRepository.findById(id)
                .orElseThrow(() -> new com.focusmeet.common.exception.ResourceNotFoundException(
                        "Meeting", "id", id));
        return ResponseEntity.ok(ApiResponse.ok(meeting));
    }

    // ── Create meeting ────────────────────────────────────────────────────────

    /**
     * POST /api/meetings
     * Creates a new meeting (SCHEDULED status) and returns the saved entity.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Meeting>> createMeeting(
            @Valid @RequestBody CreateMeetingRequest request,
            Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        Meeting saved = meetingService.createMeeting(userId, request.getTitle());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Meeting created", saved));
    }

    // ── Save transcript ───────────────────────────────────────────────────────

    /**
     * PATCH /api/meetings/{id}/transcript
     * Saves the full transcript and marks the meeting as COMPLETED.
     */
    @PatchMapping("/{id}/transcript")
    public ResponseEntity<ApiResponse<Meeting>> saveTranscript(
            @PathVariable UUID id,
            @Valid @RequestBody SaveTranscriptRequest request) {
        Meeting saved = meetingService.saveTranscript(
                id, request.getTranscript(), request.getDurationSeconds());
        return ResponseEntity.ok(ApiResponse.ok("Transcript saved", saved));
    }
}

