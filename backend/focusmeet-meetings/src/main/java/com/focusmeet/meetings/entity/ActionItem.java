package com.focusmeet.meetings.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * ActionItem entity — persisted to the `action_items` table.
 * Each action item belongs to exactly one Meeting.
 */
@Entity
@Table(name = "action_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** FK to the Meeting this action item belongs to. */
    @Column(name = "meeting_id", nullable = false)
    private UUID meetingId;

    /** Description of the action to be taken. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    /** Person responsible — 'Unassigned' if not specified. */
    @Column(nullable = false)
    private String owner;

    /** Optional target completion date. */
    @Column(name = "due_date")
    private LocalDate dueDate;

    /** Current status — defaults to PENDING on creation. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private ActionItemStatus status = ActionItemStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum ActionItemStatus {
        PENDING, DONE
    }
}
