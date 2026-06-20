package com.focusmeet.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {
        "com.focusmeet.auth",
        "com.focusmeet.common",
        "com.focusmeet.meetings"
})
@EntityScan(basePackages = {
        "com.focusmeet.auth.entity",
        "com.focusmeet.meetings.entity"
})
@EnableJpaRepositories(basePackages = {
        "com.focusmeet.auth.repository",
        "com.focusmeet.meetings.repository"
})
public class FocusMeetApplication {
    public static void main(String[] args) {
        SpringApplication.run(FocusMeetApplication.class, args);
    }
}
