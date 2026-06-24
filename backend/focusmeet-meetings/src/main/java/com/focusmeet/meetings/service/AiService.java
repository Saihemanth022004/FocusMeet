package com.focusmeet.meetings.service;

import com.focusmeet.meetings.dto.SummarizeResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

/**
 * Client that calls the FastAPI AI service to obtain meeting summaries.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private final RestTemplate restTemplate;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    /**
     * Call FastAPI POST /api/summarize and return the structured result.
     *
     * @param meetingId  the meeting UUID (used for logging correlation)
     * @param transcript the full transcript text
     * @return parsed {@link SummarizeResponse} from Gemini via FastAPI
     * @throws RuntimeException if the FastAPI call fails or returns an error status
     */
    public SummarizeResponse summarize(UUID meetingId, String transcript) {
        String url = aiServiceUrl + "/api/summarize/";

        Map<String, String> body = Map.of(
                "meetingId", meetingId.toString(),
                "transcript", transcript
        );

        log.info("Calling FastAPI summarize for meeting {} at {}", meetingId, url);
        try {
            ResponseEntity<SummarizeResponse> response =
                    restTemplate.postForEntity(url, body, SummarizeResponse.class);

            SummarizeResponse result = response.getBody();
            if (result == null) {
                throw new RuntimeException("AI service returned an empty response for meeting " + meetingId);
            }
            log.info("FastAPI summarize succeeded for meeting {}", meetingId);
            return result;

        } catch (HttpStatusCodeException ex) {
            log.error("FastAPI summarize returned {} for meeting {}: {}",
                    ex.getStatusCode(), meetingId, ex.getResponseBodyAsString());
            throw new RuntimeException(
                    "AI service error (" + ex.getStatusCode() + "): " + ex.getResponseBodyAsString(), ex);
        } catch (RestClientException ex) {
            log.error("Could not reach AI service for meeting {}: {}", meetingId, ex.getMessage());
            throw new RuntimeException(
                    "Could not reach AI service at " + aiServiceUrl + ": " + ex.getMessage(), ex);
        }
    }
}
