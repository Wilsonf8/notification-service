package dev.notifykit;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * HTTP client for NotifyKit API.
 * Handles async HTTP communication using Java's built-in HttpClient.
 */
class NotifyKitClient {

    private static final Logger LOGGER = Logger.getLogger(NotifyKitClient.class.getName());

    private final String apiKey;
    private final String baseUrl;
    private final HttpClient httpClient;
    private final boolean debug;

    /**
     * Creates a new NotifyKit HTTP client.
     *
     * @param apiKey  the API key for authentication
     * @param baseUrl the base URL for the API
     * @param timeout request timeout duration
     * @param debug   enable debug logging
     */
    NotifyKitClient(String apiKey, String baseUrl, Duration timeout, boolean debug) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.debug = debug;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(timeout)
                .build();
    }

    /**
     * Sends a notification asynchronously.
     *
     * @param message the notification message
     * @param options optional notification options
     * @return a CompletableFuture that completes when the request finishes
     */
    CompletableFuture<Void> sendAsync(String message, NotifyOptions options) {
        return CompletableFuture.runAsync(() -> {
            try {
                send(message, options);
            } catch (Exception e) {
                logError("Failed to send notification", e);
            }
        });
    }

    /**
     * Sends a notification synchronously (internal use).
     */
    private void send(String message, NotifyOptions options) {
        try {
            String json = buildJsonPayload(message, options);

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/v1/notify"))
                    .header("Content-Type", "application/json")
                    .header("X-API-Key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(json));

            if (options != null && options.getIdempotencyKey() != null) {
                requestBuilder.header("Idempotency-Key", options.getIdempotencyKey());
            }

            HttpRequest request = requestBuilder.build();

            logDebug("Sending notification: " + message);

            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 400) {
                logError("Failed to send notification: " + response.statusCode() + " " + response.body(), null);
                return;
            }

            logDebug("Notification sent successfully");

        } catch (Exception e) {
            logError("Failed to send notification", e);
        }
    }

    /**
     * Builds the JSON payload for the notification request.
     */
    private String buildJsonPayload(String message, NotifyOptions options) {
        StringBuilder json = new StringBuilder();
        json.append("{\"message\":\"").append(escapeJson(message)).append("\"");

        if (options != null && options.getTopic() != null) {
            json.append(",\"topic\":\"").append(escapeJson(options.getTopic())).append("\"");
        }

        json.append("}");
        return json.toString();
    }

    /**
     * Escapes special characters for JSON strings.
     */
    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private void logDebug(String message) {
        if (debug) {
            LOGGER.log(Level.INFO, "[NotifyKit] " + message);
        }
    }

    private void logError(String message, Exception e) {
        if (e != null) {
            LOGGER.log(Level.WARNING, "[NotifyKit] " + message, e);
        } else {
            LOGGER.log(Level.WARNING, "[NotifyKit] " + message);
        }
    }
}
