package com.focusmeet.meetings.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request body for saving a meeting transcript and marking it COMPLETED.
 */
@Data
public class SaveTranscriptRequest {

    /** Full transcript text produced by the AI transcription service. */
    private String transcript;

    /** Duration of the recording in seconds. */
    @NotNull(message = "durationSeconds is required")
    private Integer durationSeconds;
}
