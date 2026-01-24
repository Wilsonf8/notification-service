package com.notificationservice.controller;

import com.notificationservice.dto.NotifyRequest;
import com.notificationservice.dto.NotifyResponse;
import com.notificationservice.entity.ApiKey;
import com.notificationservice.service.ApiKeyService;
import com.notificationservice.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class NotifyController {

    private final ApiKeyService apiKeyService;
    private final EventService eventService;

    @PostMapping("/notify")
    public ResponseEntity<?> notify(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody NotifyRequest request) {

        String apiKey = extractApiKey(apiKeyHeader, authHeader);
        if (apiKey == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Missing API key"));
        }

        ApiKey key = apiKeyService.validateAndGetApiKey(apiKey)
                .orElse(null);

        if (key == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid API key"));
        }

        NotifyResponse response = eventService.createEvent(request, key);
        return ResponseEntity.accepted().body(response);
    }

    private String extractApiKey(String apiKeyHeader, String authHeader) {
        if (apiKeyHeader != null && !apiKeyHeader.isBlank()) {
            return apiKeyHeader;
        }
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
