# NotifyKit Java SDK

Official NotifyKit SDK for Java. Send notifications from your apps with a simple, non-blocking API.

## Features

- Java 11+ support (uses built-in `java.net.http.HttpClient`)
- Works with Spring Boot, Maven, Gradle, and any Java app
- Async via `CompletableFuture` - never blocks your threads
- Thread-safe singleton pattern
- Zero external dependencies
- Silent failures - logs errors but never crashes your app

## Installation

### Maven

```xml
<dependency>
    <groupId>com.notifykit</groupId>
    <artifactId>notifykit-java</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'com.notifykit:notifykit-java:1.0.0'
```

### Gradle (Kotlin DSL)

```kotlin
implementation("com.notifykit:notifykit-java:1.0.0")
```

## Quick Start

```java
import com.notifykit.NotifyKit;

// Initialize once at startup
NotifyKit.init("nsk_your_api_key");

// Send notifications anywhere in your app
NotifyKit.notify("User signed up!");
```

## API Reference

### `NotifyKit.init(apiKey)`

Initialize the SDK with your API key. Call this once at application startup.

```java
// Simple initialization
NotifyKit.init("nsk_your_api_key");

// With custom base URL
NotifyKit.init("nsk_your_api_key", "https://api.notifykit.dev");

// With all options
NotifyKit.init(
    "nsk_your_api_key",
    "https://api.notifykit.dev",
    Duration.ofSeconds(10),  // timeout
    true                      // debug logging
);
```

### `NotifyKit.notify(message)`

Send a notification asynchronously. Returns immediately without blocking.

```java
// Simple message
NotifyKit.notify("Hello world!");
```

### `NotifyKit.notify(message, options)`

Send a notification with options using the builder pattern.

```java
import com.notifykit.NotifyOptions;

// With topic for categorization
NotifyKit.notify("New order received", NotifyOptions.builder()
    .topic("orders")
    .build());

// With idempotency key to prevent duplicates
NotifyKit.notify("Welcome email sent", NotifyOptions.builder()
    .topic("onboarding")
    .idempotencyKey("welcome-" + userId)
    .build());
```

### `NotifyKit.isInitialized()`

Check if the SDK has been initialized.

```java
if (!NotifyKit.isInitialized()) {
    NotifyKit.init("nsk_your_api_key");
}
```

## Framework Examples

### Spring Boot

```java
// Application.java
import com.notifykit.NotifyKit;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;

@SpringBootApplication
public class Application {

    @Value("${notifykit.api-key}")
    private String apiKey;

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @PostConstruct
    public void initNotifyKit() {
        NotifyKit.init(apiKey);
    }
}

// OrderController.java
import com.notifykit.NotifyKit;
import com.notifykit.NotifyOptions;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @PostMapping
    public Order createOrder(@RequestBody CreateOrderRequest request) {
        Order order = orderService.create(request);

        // Fire-and-forget notification
        NotifyKit.notify("New order #" + order.getId() + " for $" + order.getTotal(),
            NotifyOptions.builder()
                .topic("orders")
                .build());

        return order;
    }
}
```

### Spring Boot with Configuration Class

```java
// NotifyKitConfig.java
import com.notifykit.NotifyKit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;

@Configuration
public class NotifyKitConfig {

    @Value("${notifykit.api-key}")
    private String apiKey;

    @Value("${notifykit.debug:false}")
    private boolean debug;

    @PostConstruct
    public void init() {
        NotifyKit.init(
            apiKey,
            "https://api.notifykit.dev",
            java.time.Duration.ofSeconds(10),
            debug
        );
    }
}
```

```properties
# application.properties
notifykit.api-key=nsk_your_api_key
notifykit.debug=false
```

### Plain Java

```java
import com.notifykit.NotifyKit;
import com.notifykit.NotifyOptions;

public class Main {
    public static void main(String[] args) {
        // Initialize from environment variable
        NotifyKit.init(System.getenv("NOTIFYKIT_API_KEY"));

        // Send notification
        NotifyKit.notify("Application started", NotifyOptions.builder()
            .topic("system")
            .build());

        // Your application logic...
    }
}
```

### With CompletableFuture (Advanced)

For cases where you need to wait for the notification:

```java
import java.util.concurrent.CompletableFuture;

// The SDK sends notifications asynchronously via CompletableFuture internally
// For fire-and-forget usage, just call notify():
NotifyKit.notify("Event happened");

// If you need to know when ALL notifications are sent (e.g., before shutdown),
// you can use a shutdown hook or Thread.sleep() for the background threads
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    try {
        Thread.sleep(1000); // Give pending notifications time to send
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
}));
```

## Error Handling

The SDK is designed to never throw errors or crash your app. All errors are logged using `java.util.logging` but won't interrupt your code:

```java
// This won't throw even if the API is down
NotifyKit.notify("Hello world!");

// Enable debug mode for more detailed logging
NotifyKit.init(
    "nsk_your_api_key",
    "https://api.notifykit.dev",
    Duration.ofSeconds(10),
    true  // debug = true
);
```

## Thread Safety

The SDK is fully thread-safe:
- Uses `AtomicReference` for the client instance
- Uses `volatile` for the initialization flag
- Safe to call from multiple threads simultaneously

```java
// Safe to call from any thread
executorService.submit(() -> NotifyKit.notify("From thread 1"));
executorService.submit(() -> NotifyKit.notify("From thread 2"));
```

## License

MIT
