package com.focusmeet.meetings.controller;

import com.focusmeet.common.dto.ApiResponse;
import com.focusmeet.meetings.dto.CreateMeetingRequest;
import com.focusmeet.meetings.entity.Meeting;
import com.focusmeet.meetings.repository.MeetingRepository;
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

    private final MeetingRepository meetingRepository;

    /** GET /api/meetings — list all meetings for the authenticated user */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Meeting>>> listMeetings(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        List<Meeting> meetings = meetingRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return ResponseEntity.ok(ApiResponse.ok(meetings));
    }

    /** GET /api/meetings/{id} — fetch a single meeting */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Meeting>> getMeeting(@PathVariable UUID id) {
        Meeting meeting = meetingRepository.findById(id)
                .orElseThrow(() -> new com.focusmeet.common.exception.ResourceNotFoundException(
                        "Meeting", "id", id));
        return ResponseEntity.ok(ApiResponse.ok(meeting));
    }

    /** POST /api/meetings — create a new meeting */
    @PostMapping
    public ResponseEntity<ApiResponse<Meeting>> createMeeting(
            @Valid @RequestBody CreateMeetingRequest request,
            Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        Meeting meeting = Meeting.builder()
                .userId(userId)
                .title(request.getTitle())
                .status(request.getStatus())
                .build();
        Meeting saved = meetingRepository.save(meeting);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Meeting created", saved));
    }
}
