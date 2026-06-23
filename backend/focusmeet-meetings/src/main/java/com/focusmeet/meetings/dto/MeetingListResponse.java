package com.focusmeet.meetings.dto;

import com.focusmeet.meetings.entity.Meeting;
import com.focusmeet.meetings.entity.Meeting.MeetingStatus;
import lombok.Value;

import java.time.Instant;
import java.util.UUID;

/**
 * Slim projection returned by GET /api/meetings.
 * Does NOT include the full transcript to keep payload sizes small.
 */
@Value
public class MeetingListResponse {

    UUID id;
    String title;
    MeetingStatus status;
    Instant createdAt;
    Integer durationSeconds;

    /** Factory — maps from a Meeting entity. */
    public static MeetingListResponse from(Meeting m) {
        return new MeetingListResponse(
                m.getId(),
                m.getTitle(),
                m.getStatus(),
                m.getCreatedAt(),
                m.getDurationSeconds()
        );
    }
}
