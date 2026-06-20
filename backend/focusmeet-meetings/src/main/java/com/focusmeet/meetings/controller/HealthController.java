package com.focusmeet.meetings.controller;

import com.focusmeet.common.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Health-check endpoint — unauthenticated.
 * GET /api/health → { status: "ok", timestamp: "<ISO-8601>" }
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        Map<String, String> payload = Map.of(
                "status", "ok",
                "timestamp", Instant.now().toString()
        );
        return ResponseEntity.ok(ApiResponse.ok(payload));
    }
}
