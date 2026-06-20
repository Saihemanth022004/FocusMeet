package com.focusmeet.meetings.dto;

import com.focusmeet.meetings.entity.Meeting.MeetingStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request body for creating a new meeting.
 */
@Data
public class CreateMeetingRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    private MeetingStatus status = MeetingStatus.SCHEDULED;
}
