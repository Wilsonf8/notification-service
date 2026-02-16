package com.notificationservice.controller;

import com.notificationservice.entity.StripeProcessedEvent;
import com.notificationservice.repository.StripeProcessedEventRepository;
import com.notificationservice.service.StripeService;
import com.notificationservice.service.SubscriptionService;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.StripeObject;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.model.Invoice;
import com.stripe.exception.StripeException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Controller for handling Stripe webhook events.
 * Verifies signatures, deduplicates events, and delegates to SubscriptionService.
 */
@RestController
@RequestMapping("/webhooks/stripe")
@RequiredArgsConstructor
@Slf4j
public class StripeWebhookController {

    private final StripeService stripeService;
    private final SubscriptionService subscriptionService;
    private final StripeProcessedEventRepository processedEventRepository;

    /**
     * Handles incoming Stripe webhook events.
     * Entire handler runs in a single transaction for atomic dedup + processing.
     *
     * @param payload the raw request body
     * @param sigHeader the Stripe-Signature header
     * @return 200 OK on success
     */
    @PostMapping
    @Transactional
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        Event event;
        try {
            event = stripeService.constructEvent(payload, sigHeader);
        } catch (Exception e) {
            log.warn("Invalid Stripe webhook signature: {}", e.getMessage());
            return ResponseEntity.status(400).build();
        }

        // Atomic dedup via unique constraint
        try {
            processedEventRepository.saveAndFlush(
                    StripeProcessedEvent.builder()
                            .eventId(event.getId())
                            .eventType(event.getType())
                            .build());
        } catch (DataIntegrityViolationException e) {
            log.debug("Duplicate Stripe event ignored: {}", event.getId());
            return ResponseEntity.ok().build();
        }

        log.info("Processing Stripe event: {} ({})", event.getType(), event.getId());

        try {
            switch (event.getType()) {
                case "checkout.session.completed" -> handleCheckoutCompleted(event);
                case "customer.subscription.updated" -> handleSubscriptionUpdated(event);
                case "customer.subscription.deleted" -> handleSubscriptionDeleted(event);
                case "invoice.payment_failed" -> handleInvoicePaymentFailed(event);
                case "invoice.payment_succeeded" -> handleInvoicePaymentSucceeded(event);
                default -> log.debug("Ignoring Stripe event type: {}", event.getType());
            }
        } catch (Exception e) {
            log.error("Error processing Stripe event {}: {}", event.getId(), e.getMessage(), e);
            throw e; // Re-throw to rollback transaction (including dedup row)
        }

        return ResponseEntity.ok().build();
    }

    private void handleCheckoutCompleted(Event event) {
        Session session = deserialize(event, Session.class);
        if (session == null) {
            throw new RuntimeException("Failed to deserialize checkout session from event " + event.getId());
        }

        String clientReferenceId = session.getClientReferenceId();
        if (clientReferenceId == null || clientReferenceId.isBlank()) {
            throw new RuntimeException("Checkout session " + session.getId() + " missing client_reference_id");
        }

        UUID orgId;
        try {
            orgId = UUID.fromString(clientReferenceId);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid client_reference_id: " + clientReferenceId, e);
        }

        String stripeSubId = session.getSubscription();
        if (stripeSubId == null) {
            throw new RuntimeException("Checkout session " + session.getId() + " has no subscription");
        }

        // Retrieve the full subscription to get period dates and price
        try {
            Subscription stripeSub = Subscription.retrieve(stripeSubId);
            String priceId = null;
            if (stripeSub.getItems() != null && !stripeSub.getItems().getData().isEmpty()) {
                priceId = stripeSub.getItems().getData().get(0).getPrice().getId();
            }

            subscriptionService.handleCheckoutCompleted(
                    orgId,
                    session.getCustomer(),
                    stripeSubId,
                    priceId,
                    stripeSub.getCurrentPeriodStart(),
                    stripeSub.getCurrentPeriodEnd(),
                    event.getCreated());
        } catch (Exception e) {
            log.error("Failed to retrieve subscription {}: {}", stripeSubId, e.getMessage());
            throw new RuntimeException("Failed to process checkout", e);
        }
    }

    private void handleSubscriptionUpdated(Event event) {
        Subscription sub = deserialize(event, Subscription.class);
        if (sub == null) {
            throw new RuntimeException("Failed to deserialize subscription from event " + event.getId());
        }

        String priceId = null;
        if (sub.getItems() != null && !sub.getItems().getData().isEmpty()) {
            priceId = sub.getItems().getData().get(0).getPrice().getId();
        }

        subscriptionService.handleSubscriptionUpdated(
                sub.getId(),
                sub.getStatus(),
                priceId,
                sub.getCurrentPeriodStart(),
                sub.getCurrentPeriodEnd(),
                Boolean.TRUE.equals(sub.getCancelAtPeriodEnd()),
                sub.getCanceledAt(),
                event.getCreated());
    }

    private void handleSubscriptionDeleted(Event event) {
        Subscription sub = deserialize(event, Subscription.class);
        if (sub == null) {
            throw new RuntimeException("Failed to deserialize subscription from event " + event.getId());
        }

        subscriptionService.handleSubscriptionDeleted(sub.getId(), event.getCreated());
    }

    private void handleInvoicePaymentFailed(Event event) {
        Invoice invoice = deserialize(event, Invoice.class);
        if (invoice == null || invoice.getSubscription() == null) return;

        log.warn("Invoice payment failed for subscription {}", invoice.getSubscription());
        // Stripe will automatically update subscription status to past_due,
        // which we'll handle via customer.subscription.updated webhook
    }

    private void handleInvoicePaymentSucceeded(Event event) {
        Invoice invoice = deserialize(event, Invoice.class);
        if (invoice == null || invoice.getSubscription() == null) return;

        log.info("Invoice payment succeeded for subscription {}", invoice.getSubscription());
        // Stripe will automatically update subscription status,
        // which we'll handle via customer.subscription.updated webhook
    }

    /**
     * Deserializes the event data object, falling back to unsafe deserialization
     * when the event API version doesn't match the SDK's pinned version.
     *
     * @param event the Stripe event
     * @param clazz the expected object type
     * @return the deserialized object, or null if deserialization fails
     */
    @SuppressWarnings("unchecked")
    private <T extends StripeObject> T deserialize(Event event, Class<T> clazz) {
        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        if (deserializer.getObject().isPresent()) {
            return (T) deserializer.getObject().get();
        }
        // API version mismatch — fall back to unsafe deserialization
        try {
            return (T) deserializer.deserializeUnsafe();
        } catch (StripeException e) {
            log.error("Failed to deserialize Stripe event {} (type {}): {}",
                    event.getId(), event.getType(), e.getMessage());
            return null;
        }
    }
}
