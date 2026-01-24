package com.notifykit;

/**
 * Options for configuring a notification.
 * Use the builder pattern to create instances.
 *
 * <pre>{@code
 * NotifyOptions options = NotifyOptions.builder()
 *     .topic("alerts")
 *     .idempotencyKey("unique-123")
 *     .build();
 * }</pre>
 */
public class NotifyOptions {

    private final String topic;
    private final String idempotencyKey;

    private NotifyOptions(Builder builder) {
        this.topic = builder.topic;
        this.idempotencyKey = builder.idempotencyKey;
    }

    /**
     * Gets the topic for this notification.
     *
     * @return the topic, or null if not set
     */
    public String getTopic() {
        return topic;
    }

    /**
     * Gets the idempotency key for this notification.
     *
     * @return the idempotency key, or null if not set
     */
    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    /**
     * Creates a new builder for NotifyOptions.
     *
     * @return a new builder instance
     */
    public static Builder builder() {
        return new Builder();
    }

    /**
     * Builder for creating NotifyOptions instances.
     */
    public static class Builder {
        private String topic;
        private String idempotencyKey;

        private Builder() {
        }

        /**
         * Sets the topic for categorizing the notification.
         *
         * @param topic the topic name
         * @return this builder
         */
        public Builder topic(String topic) {
            this.topic = topic;
            return this;
        }

        /**
         * Sets the idempotency key to prevent duplicate notifications.
         *
         * @param idempotencyKey a unique key for this notification
         * @return this builder
         */
        public Builder idempotencyKey(String idempotencyKey) {
            this.idempotencyKey = idempotencyKey;
            return this;
        }

        /**
         * Builds the NotifyOptions instance.
         *
         * @return a new NotifyOptions instance
         */
        public NotifyOptions build() {
            return new NotifyOptions(this);
        }
    }
}
