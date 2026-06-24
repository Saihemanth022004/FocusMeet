package com.focusmeet.meetings.controller;

import com.focusmeet.common.dto.ApiResponse;
import com.focusmeet.common.exception.ResourceNotFoundException;
import com.focusmeet.meetings.dto.ActionItemResponse;
import com.focusmeet.meetings.dto.UpdateActionItemStatusRequest;
import com.focusmeet.meetings.entity.ActionItem;
import com.focusmeet.meetings.repository.ActionItemRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ActionItemController {

    private final ActionItemRepository actionItemRepository;

    // ── List action items for a meeting ──────────────────────────────────────

    /**
     * GET /api/meetings/{id}/action-items
     * Returns all action items for the given meeting, ordered by creation time.
     */
    @GetMapping("/api/meetings/{id}/action-items")
    public ResponseEntity<ApiResponse<List<ActionItemResponse>>> listActionItems(
            @PathVariable UUID id) {

        List<ActionItemResponse> items = actionItemRepository
                .findByMeetingIdOrderByCreatedAtAsc(id)
                .stream()
                .map(ActionItemResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    // ── Toggle action item status ─────────────────────────────────────────────

    /**
     * PATCH /api/action-items/{id}/status
     * Toggle or explicitly set PENDING / DONE for an action item.
     */
    @PatchMapping("/api/action-items/{id}/status")
    public ResponseEntity<ApiResponse<ActionItemResponse>> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateActionItemStatusRequest request) {

        ActionItem item = actionItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ActionItem", "id", id));

        item.setStatus(request.getStatus());
        ActionItem saved = actionItemRepository.save(item);

        return ResponseEntity.ok(ApiResponse.ok("Status updated", ActionItemResponse.from(saved)));
    }
}
