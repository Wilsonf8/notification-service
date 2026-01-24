package com.notificationservice.telegram;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/internal/telegram")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookController {

    private final TelegramService telegramService;

    @Value("${telegram.bot.webhook-secret}")
    private String webhookSecret;

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secretToken,
            @RequestBody Map<String, Object> update) {

        // Verify webhook secret
        if (webhookSecret != null && !webhookSecret.isBlank() && !webhookSecret.equals(secretToken)) {
            log.warn("Invalid webhook secret received");
            return ResponseEntity.ok("OK"); // Always return 200 to Telegram
        }

        try {
            processUpdate(update);
        } catch (Exception e) {
            log.error("Error processing webhook update", e);
        }

        // Always return 200 to Telegram
        return ResponseEntity.ok("OK");
    }

    private void processUpdate(Map<String, Object> update) {
        Map<String, Object> message = (Map<String, Object>) update.get("message");
        if (message == null) return;

        String text = (String) message.get("text");
        if (text == null) return;

        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
        Long chatId = ((Number) chat.get("id")).longValue();

        Map<String, Object> from = (Map<String, Object>) message.get("from");
        String username = from != null ? (String) from.get("username") : null;

        if (text.startsWith("/start")) {
            String token = null;
            if (text.length() > 7) {
                token = text.substring(7).trim();
            }
            telegramService.handleStartCommand(chatId, username, token);
        }
    }
}
