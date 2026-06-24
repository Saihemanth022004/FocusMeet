package com.focusmeet.meetings.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import com.focusmeet.meetings.entity.ActionItem.ActionItemStatus;

/**
 * Request body for PATCH /api/action-items/{id}/status.
 */
@Data
public class UpdateActionItemStatusRequest {

    @NotNull(message = "status must not be null")
    private ActionItemStatus status;
}
