package com.notificationservice;

import com.notificationservice.config.LiveKitProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main application entry point for the NotifyKit notification service.
 * Configures Spring Boot with JPA repositories and scheduling support.
 */
@SpringBootApplication
@EnableScheduling
@EnableJpaRepositories(basePackages = "com.notificationservice.repository")
@EnableConfigurationProperties(LiveKitProperties.class)
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

}
