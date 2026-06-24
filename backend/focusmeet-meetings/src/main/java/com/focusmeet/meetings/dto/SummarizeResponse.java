package com.focusmeet.meetings.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Full summarization result returned by POST /api/meetings/{id}/summarize.
 * Mirrors the structure produced by the FastAPI /api/summarize endpoint.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SummarizeResponse {

    private UUID meetingId;
    private String summary;
    private List<String> decisions;
    private List<ActionItemDto> actionItems;
    private List<String> topics;

    /** The persisted action item rows (IDs included, ready for toggle). */
    private List<ActionItemResponse> savedActionItems;

    /**
     * Raw action item shape as returned by FastAPI (no UUID yet).
     * Used only during deserialization from the FastAPI JSON response.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ActionItemDto {
        private String text;
        private String owner;
        private String dueDate; // "YYYY-MM-DD" or null
    }
}
