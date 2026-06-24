package com.focusmeet.meetings.repository;

import com.focusmeet.meetings.entity.ActionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ActionItemRepository extends JpaRepository<ActionItem, UUID> {

    /** Return all action items for a meeting, ordered oldest-first (insertion order). */
    List<ActionItem> findByMeetingIdOrderByCreatedAtAsc(UUID meetingId);

    /** Delete all action items for a meeting (used when re-summarizing). */
    void deleteByMeetingId(UUID meetingId);
}
