package com.focusmeet.meetings.dto;

import com.focusmeet.meetings.entity.ActionItem;
import com.focusmeet.meetings.entity.ActionItem.ActionItemStatus;
import lombok.Value;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Slim projection of an ActionItem returned in API responses.
 */
@Value
public class ActionItemResponse {

    UUID id;
    UUID meetingId;
    String text;
    String owner;
    LocalDate dueDate;
    ActionItemStatus status;

    /** Factory — map from entity. */
    public static ActionItemResponse from(ActionItem item) {
        return new ActionItemResponse(
                item.getId(),
                item.getMeetingId(),
                item.getText(),
                item.getOwner(),
                item.getDueDate(),
                item.getStatus()
        );
    }
}
