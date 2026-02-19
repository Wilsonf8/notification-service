package com.notificationservice.controller;

import com.notificationservice.dto.CheckoutSessionRequest;
import com.notificationservice.dto.CheckoutSessionResponse;
import com.notificationservice.dto.InvoiceListResponse;
import com.notificationservice.dto.SetupIntentResponse;
import com.notificationservice.dto.SubscriptionDto;
import com.notificationservice.dto.UpcomingInvoiceDto;
import com.notificationservice.entity.Organization;
import com.notificationservice.entity.SubscriptionStatus;
import com.notificationservice.service.OrganizationService;
import com.notificationservice.service.StripeService;
import com.notificationservice.service.SubscriptionService;
import com.stripe.exception.StripeException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for subscription billing operations.
 * Handles subscription status, checkout, cancellation, reactivation, and payment method updates.
 * All endpoints are restricted to OWNER role only.
 */
@RestController
@RequestMapping("/api/organizations/{slug}/billing")
@RequiredArgsConstructor
@Slf4j
public class BillingController {

    private final OrganizationService organizationService;
    private final SubscriptionService subscriptionService;
    private final StripeService stripeService;

    /**
     * Gets the current subscription status for an organization.
     * Restricted to OWNER role.
     *
     * @param slug the organization's URL slug
     * @param userId the authenticated user's ID
     * @return the subscription status
     */
    @GetMapping("/status")
    public ResponseEntity<SubscriptionDto> getSubscriptionStatus(
            @PathVariable String slug,
            @AuthenticationPrincipal UUID userId) {
        Organization org = organizationService.getOrganizationForBillingStatus(slug, userId);

        SubscriptionDto dto = subscriptionService.getSubscriptionForOrganization(org.getId())
                .map(sub -> new SubscriptionDto(
                        sub.getStatus(),
                        sub.getStripePriceId(),
                        sub.getCurrentPeriodStart(),
                        sub.getCurrentPeriodEnd(),
                        sub.getCancelAtPeriodEnd(),
                        sub.getCanceledAt()))
                .orElse(new SubscriptionDto(
                        SubscriptionStatus.INACTIVE, null, null, null, false, null));

        return ResponseEntity.ok(dto);
    }

    /**
     * Creates a Stripe Subscription with incomplete payment and returns the client secret.
     * Frontend uses this to render the Payment Element for card collection.
     * Restricted to OWNER role.
     *
     * @param slug the organization's URL slug
     * @param request the checkout request with price ID
     * @param userId the authenticated user's ID
     * @return the PaymentIntent client secret
     * @throws StripeException if the Stripe API call fails
     */
    @PostMapping("/checkout")
    public ResponseEntity<CheckoutSessionResponse> createCheckoutSession(
            @PathVariable String slug,
            @Valid @RequestBody CheckoutSessionRequest request,
            @AuthenticationPrincipal UUID userId) throws StripeException {
        Organization org = organizationService.getOrganizationForBilling(slug, userId);

        if (subscriptionService.isOrganizationSubscriptionActive(org.getId())) {
            throw new IllegalArgumentException("Organization already has an active subscription");
        }

        if (!stripeService.getValidPriceIds().contains(request.priceId())) {
            throw new IllegalArgumentException("Invalid price ID");
        }

        subscriptionService.cancelIncompleteSubscription(org.getId(), stripeService);

        StripeService.SubscriptionResult result = stripeService.createSubscription(org, request.priceId());
        subscriptionService.createPendingSubscription(org.getId(), result.subscriptionId(), request.priceId());

        return ResponseEntity.ok(new CheckoutSessionResponse(result.clientSecret()));
    }

    /**
     * Cancels the subscription at the end of the current billing period.
     * Restricted to OWNER role.
     *
     * @param slug the organization's URL slug
     * @param userId the authenticated user's ID
     * @throws StripeException if the Stripe API call fails
     */
    @PostMapping("/cancel")
    public ResponseEntity<Void> cancelSubscription(
            @PathVariable String slug,
            @AuthenticationPrincipal UUID userId) throws StripeException {
        Organization org = organizationService.getOrganizationForBilling(slug, userId);
        subscriptionService.cancelAtPeriodEnd(org.getId(), stripeService);
        return ResponseEntity.ok().build();
    }

    /**
     * Reactivates a subscription that was set to cancel at period end.
     * Restricted to OWNER role.
     *
     * @param slug the organization's URL slug
     * @param userId the authenticated user's ID
     * @throws StripeException if the Stripe API call fails
     */
    @PostMapping("/reactivate")
    public ResponseEntity<Void> reactivateSubscription(
            @PathVariable String slug,
            @AuthenticationPrincipal UUID userId) throws StripeException {
        Organization org = organizationService.getOrganizationForBilling(slug, userId);
        subscriptionService.reactivateSubscription(org.getId(), stripeService);
        return ResponseEntity.ok().build();
    }

    /**
     * Creates a SetupIntent for updating the payment method via Payment Element.
     * Restricted to OWNER role.
     *
     * @param slug the organization's URL slug
     * @param userId the authenticated user's ID
     * @return the SetupIntent client secret
     * @throws StripeException if the Stripe API call fails
     */
    @PostMapping("/update-payment-method")
    public ResponseEntity<SetupIntentResponse> updatePaymentMethod(
            @PathVariable String slug,
            @AuthenticationPrincipal UUID userId) throws StripeException {
        Organization org = organizationService.getOrganizationForBilling(slug, userId);
        if (org.getStripeCustomerId() == null) {
            throw new IllegalArgumentException("No billing account found");
        }
        String clientSecret = stripeService.createSetupIntent(org.getStripeCustomerId());
        return ResponseEntity.ok(new SetupIntentResponse(clientSecret));
    }

    /**
     * Lists invoices for an organization's Stripe customer with cursor-based pagination.
     * Restricted to OWNER role.
     *
     * @param slug the organization's URL slug
     * @param limit the maximum number of invoices to return (1-100, default 10)
     * @param startingAfter the invoice ID to start after for pagination
     * @param userId the authenticated user's ID
     * @return the paginated invoice list
     * @throws StripeException if the Stripe API call fails
     */
    @GetMapping("/invoices")
    public ResponseEntity<InvoiceListResponse> listInvoices(
            @PathVariable String slug,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String startingAfter,
            @AuthenticationPrincipal UUID userId) throws StripeException {
        Organization org = organizationService.getOrganizationForBilling(slug, userId);

        if (org.getStripeCustomerId() == null) {
            return ResponseEntity.ok(new InvoiceListResponse(java.util.List.of(), false, null));
        }

        int clampedLimit = Math.max(1, Math.min(100, limit));
        InvoiceListResponse response = stripeService.listInvoices(
                org.getStripeCustomerId(), clampedLimit, startingAfter);
        return ResponseEntity.ok(response);
    }

    /**
     * Gets the upcoming invoice for an organization's subscription.
     * Returns 204 No Content if no upcoming invoice exists.
     * Restricted to OWNER role.
     *
     * @param slug the organization's URL slug
     * @param userId the authenticated user's ID
     * @return the upcoming invoice or 204 if none
     * @throws StripeException if the Stripe API call fails
     */
    @GetMapping("/upcoming")
    public ResponseEntity<UpcomingInvoiceDto> getUpcomingInvoice(
            @PathVariable String slug,
            @AuthenticationPrincipal UUID userId) throws StripeException {
        Organization org = organizationService.getOrganizationForBilling(slug, userId);

        if (org.getStripeCustomerId() == null) {
            return ResponseEntity.noContent().build();
        }

        UpcomingInvoiceDto upcoming = stripeService.getUpcomingInvoice(org.getStripeCustomerId());
        if (upcoming == null) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(upcoming);
    }
}
