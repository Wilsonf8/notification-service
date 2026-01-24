package dev.notifykit;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * NotifyKit SDK for Java.
 * Send notifications from your apps with a simple API.
 *
 * <p>Initialize once at startup, then send notifications from anywhere:</p>
 *
 * <pre>{@code
 * // Initialize once
 * NotifyKit.init("nsk_your_api_key");
 *
 * // Send notifications anywhere
 * NotifyKit.notify("User signed up!");
 * NotifyKit.notify("Payment received", NotifyOptions.builder()
 *     .topic("payments")
 *     .build());
 * }</pre>
 */
public final class NotifyKit {

    private static final Logger LOGGER = Logger.getLogger(NotifyKit.class.getName());
    private static final String DEFAULT_BASE_URL = "https://api.notifykit.dev";
    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(10);

    private static final AtomicReference<NotifyKitClient> CLIENT = new AtomicReference<>();
    private static volatile boolean initialized = false;

    private NotifyKit() {
        // Prevent instantiation
    }

    /**
     * Initializes the NotifyKit SDK with your API key.
     * Call this once at application startup.
     *
     * @param apiKey your NotifyKit API key (starts with 'nsk_')
     */
    public static void init(String apiKey) {
        init(apiKey, DEFAULT_BASE_URL, DEFAULT_TIMEOUT, false);
    }

    /**
     * Initializes the NotifyKit SDK with custom options.
     *
     * @param apiKey  your NotifyKit API key (starts with 'nsk_')
     * @param baseUrl custom API base URL
     */
    public static void init(String apiKey, String baseUrl) {
        init(apiKey, baseUrl, DEFAULT_TIMEOUT, false);
    }

    /**
     * Initializes the NotifyKit SDK with custom options.
     *
     * @param apiKey  your NotifyKit API key (starts with 'nsk_')
     * @param baseUrl custom API base URL
     * @param timeout request timeout duration
     * @param debug   enable debug logging
     */
    public static void init(String apiKey, String baseUrl, Duration timeout, boolean debug) {
        if (apiKey == null || apiKey.isEmpty()) {
            throw new IllegalArgumentException("API key is required");
        }

        CLIENT.set(new NotifyKitClient(apiKey, baseUrl, timeout, debug));
        initialized = true;

        if (debug) {
            LOGGER.log(Level.INFO, "[NotifyKit] Initialized with base URL: " + baseUrl);
        }
    }

    /**
     * Sends a notification asynchronously.
     * This method is fire-and-forget: it returns immediately and won't throw errors.
     * Errors are logged but won't crash your application.
     *
     * @param message the notification message to send
     */
    public static void notify(String message) {
        notify(message, null);
    }

    /**
     * Sends a notification asynchronously with options.
     * This method is fire-and-forget: it returns immediately and won't throw errors.
     * Errors are logged but won't crash your application.
     *
     * @param message the notification message to send
     * @param options optional configuration for the notification
     */
    public static void notify(String message, NotifyOptions options) {
        if (!initialized) {
            LOGGER.log(Level.WARNING,
                    "[NotifyKit] Not initialized. Call NotifyKit.init() with your API key first.");
            return;
        }

        NotifyKitClient client = CLIENT.get();
        if (client == null) {
            LOGGER.log(Level.WARNING, "[NotifyKit] Client not available");
            return;
        }

        client.sendAsync(message, options);
    }

    /**
     * Checks if the SDK has been initialized.
     *
     * @return true if init() has been called with an API key
     */
    public static boolean isInitialized() {
        return initialized && CLIENT.get() != null;
    }

    /**
     * Resets the SDK state. Useful for testing.
     */
    public static void reset() {
        CLIENT.set(null);
        initialized = false;
    }
}
