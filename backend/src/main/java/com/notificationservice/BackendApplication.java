package com.notificationservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main application entry point for the NotifyKit notification service.
 * Configures Spring Boot with JPA repositories and scheduling support.
 */
@SpringBootApplication
@EnableScheduling
@EnableJpaRepositories(basePackages = "com.notificationservice.repository")
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

}
