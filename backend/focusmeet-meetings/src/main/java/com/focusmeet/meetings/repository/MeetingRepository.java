package com.focusmeet.meetings.repository;

import com.focusmeet.meetings.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, UUID> {

    /** Find all meetings belonging to a specific user, ordered newest first. */
    List<Meeting> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
