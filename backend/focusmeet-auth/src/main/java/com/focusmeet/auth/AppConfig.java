package com.focusmeet.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Application-level bean configuration.
 */
@Configuration
public class AppConfig {

    /**
     * RestTemplate bean used by AiService to call the FastAPI summarization endpoint.
     * A single shared instance is thread-safe for concurrent calls.
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
