package com.notificationservice.telegram;

import com.notificationservice.entity.ConnectToken;
import com.notificationservice.entity.TelegramDestination;
import com.notificationservice.repository.ConnectTokenRepository;
import com.notificationservice.repository.TelegramDestinationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String TELEGRAM_API_URL = "https://api.telegram.org/bot";

    private final ConnectTokenRepository connectTokenRepository;
    private final TelegramDestinationRepository telegramDestinationRepository;
    private final RestTemplate restTemplate;

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${telegram.bot.username}")
    private String botUsername;

    public String generateConnectToken(UUID projectId, UUID userId, com.notificationservice.entity.Project project, com.notificationservice.entity.User user) {
        String token = "ct_" + generateRandomString(32);

        ConnectToken connectToken = ConnectToken.builder()
                .token(token)
                .project(project)
                .user(user)
                .expiresAt(OffsetDateTime.now().plusHours(24))
                .build();

        connectTokenRepository.save(connectToken);

        return token;
    }

    public String getDeepLink(String token) {
        return "https://t.me/" + botUsername + "?start=" + token;
    }

    @Transactional
    public void handleStartCommand(Long chatId, String username, String token) {
        if (token == null || token.isBlank()) {
            sendMessage(chatId, "Welcome! Please use the connect link from your dashboard to link this chat.");
            return;
        }

        ConnectToken connectToken = connectTokenRepository.findByToken(token).orElse(null);

        if (connectToken == null || !connectToken.isValid()) {
            sendMessage(chatId, "This link has expired or is invalid. Please generate a new connect link from your dashboard.");
            return;
        }

        // Check if project already has a destination
        if (telegramDestinationRepository.findByProjectId(connectToken.getProject().getId()).isPresent()) {
            sendMessage(chatId, "This project is already connected to a Telegram account. Disconnect first from the dashboard to reconnect.");
            connectToken.setUsed(true);
            connectTokenRepository.save(connectToken);
            return;
        }

        // Create destination
        TelegramDestination destination = TelegramDestination.builder()
                .project(connectToken.getProject())
                .chatId(chatId)
                .username(username)
                .build();

        telegramDestinationRepository.save(destination);

        connectToken.setUsed(true);
        connectTokenRepository.save(connectToken);

        sendMessage(chatId, "Connected! You will now receive notifications for project: " + connectToken.getProject().getName());
    }

    public SendResult sendMessage(Long chatId, String text) {
        String url = TELEGRAM_API_URL + botToken + "/sendMessage";

        Map<String, Object> body = Map.of(
                "chat_id", chatId,
                "text", text
        );

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return new SendResult(true, null, null);

        } catch (HttpClientErrorException e) {
            log.error("Telegram API error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());

            if (e.getStatusCode() == HttpStatus.FORBIDDEN) {
                return new SendResult(false, "blocked", "Bot was blocked by user");
            } else if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                // Extract retry_after from response
                try {
                    Map<String, Object> errorBody = e.getResponseBodyAs(Map.class);
                    if (errorBody != null && errorBody.containsKey("parameters")) {
                        Map<String, Object> params = (Map<String, Object>) errorBody.get("parameters");
                        Integer retryAfter = (Integer) params.get("retry_after");
                        return new SendResult(false, "rate_limited", "Retry after " + retryAfter + " seconds");
                    }
                } catch (Exception ignored) {}
                return new SendResult(false, "rate_limited", "Rate limited by Telegram");
            }

            return new SendResult(false, "error", e.getMessage());
        } catch (Exception e) {
            log.error("Failed to send Telegram message", e);
            return new SendResult(false, "error", e.getMessage());
        }
    }

    @Transactional
    public void disconnectTelegram(UUID projectId) {
        telegramDestinationRepository.findByProjectId(projectId)
                .ifPresent(telegramDestinationRepository::delete);
    }

    public record SendResult(boolean success, String errorCode, String errorMessage) {}

    private String generateRandomString(int length) {
        byte[] bytes = new byte[length];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
