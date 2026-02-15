package com.notificationservice.service;

import com.notificationservice.config.StripeProperties;
import com.notificationservice.entity.Organization;
import com.notificationservice.repository.OrganizationRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.PaymentIntent;
import com.stripe.model.SetupIntent;
import com.stripe.model.Subscription;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.SetupIntentCreateParams;
import com.stripe.param.SubscriptionCreateParams;
import com.stripe.param.SubscriptionUpdateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Service wrapping Stripe API operations for subscription billing.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StripeService {

    private final StripeProperties stripeProperties;
    private final OrganizationRepository organizationRepository;

    /**
     * Result of creating a Stripe subscription with incomplete payment.
     *
     * @param clientSecret the PaymentIntent client secret for the frontend
     * @param subscriptionId the Stripe subscription ID
     */
    public record SubscriptionResult(String clientSecret, String subscriptionId) {}

    /**
     * Initializes the Stripe API key on service startup.
     */
    @PostConstruct
    public void init() {
        if (stripeProperties.secretKey() != null && !stripeProperties.secretKey().isBlank()) {
            Stripe.apiKey = stripeProperties.secretKey();
            log.info("Stripe API key configured");
        } else {
            log.warn("Stripe API key not configured — billing features disabled");
        }
    }

    /**
     * Gets or creates a Stripe customer for an organization.
     * Stores the customer ID on the organization for future use.
     *
     * @param org the organization
     * @return the Stripe customer ID
     * @throws StripeException if the Stripe API call fails
     */
    public String getOrCreateCustomer(Organization org) throws StripeException {
        if (org.getStripeCustomerId() != null) {
            return org.getStripeCustomerId();
        }

        CustomerCreateParams params = CustomerCreateParams.builder()
                .setName(org.getName())
                .putMetadata("organizationId", org.getId().toString())
                .putMetadata("organizationSlug", org.getSlug())
                .build();

        Customer customer = Customer.create(params);
        org.setStripeCustomerId(customer.getId());
        organizationRepository.save(org);

        log.info("Created Stripe customer {} for org {}", customer.getId(), org.getSlug());
        return customer.getId();
    }

    /**
     * Creates a Stripe Subscription with incomplete payment behavior.
     * Returns the PaymentIntent client secret for the frontend Payment Element.
     *
     * @param org the organization
     * @param priceId the Stripe price ID to subscribe to
     * @return the subscription result with client secret and subscription ID
     * @throws StripeException if the Stripe API call fails
     */
    public SubscriptionResult createSubscription(Organization org, String priceId) throws StripeException {
        String customerId = getOrCreateCustomer(org);

        SubscriptionCreateParams params = SubscriptionCreateParams.builder()
                .setCustomer(customerId)
                .addItem(SubscriptionCreateParams.Item.builder()
                        .setPrice(priceId)
                        .build())
                .setPaymentBehavior(SubscriptionCreateParams.PaymentBehavior.DEFAULT_INCOMPLETE)
                .setPaymentSettings(SubscriptionCreateParams.PaymentSettings.builder()
                        .setSaveDefaultPaymentMethod(
                                SubscriptionCreateParams.PaymentSettings.SaveDefaultPaymentMethod.ON_SUBSCRIPTION)
                        .build())
                .putMetadata("organizationId", org.getId().toString())
                .addExpand("latest_invoice.payment_intent")
                .build();

        Subscription stripeSub = Subscription.create(params);
        Invoice invoice = stripeSub.getLatestInvoiceObject();
        PaymentIntent paymentIntent = invoice.getPaymentIntentObject();

        log.info("Created subscription {} for org {}", stripeSub.getId(), org.getSlug());
        return new SubscriptionResult(paymentIntent.getClientSecret(), stripeSub.getId());
    }

    /**
     * Cancels a Stripe subscription immediately.
     *
     * @param stripeSubscriptionId the Stripe subscription ID
     * @throws StripeException if the Stripe API call fails
     */
    public void cancelSubscription(String stripeSubscriptionId) throws StripeException {
        Subscription sub = Subscription.retrieve(stripeSubscriptionId);
        sub.cancel();
    }

    /**
     * Sets a Stripe subscription to cancel at the end of the current period.
     *
     * @param stripeSubscriptionId the Stripe subscription ID
     * @throws StripeException if the Stripe API call fails
     */
    public void cancelSubscriptionAtPeriodEnd(String stripeSubscriptionId) throws StripeException {
        Subscription sub = Subscription.retrieve(stripeSubscriptionId);
        SubscriptionUpdateParams params = SubscriptionUpdateParams.builder()
                .setCancelAtPeriodEnd(true)
                .build();
        sub.update(params);
    }

    /**
     * Reactivates a subscription that was set to cancel at period end.
     *
     * @param stripeSubscriptionId the Stripe subscription ID
     * @throws StripeException if the Stripe API call fails
     */
    public void reactivateSubscription(String stripeSubscriptionId) throws StripeException {
        Subscription sub = Subscription.retrieve(stripeSubscriptionId);
        SubscriptionUpdateParams params = SubscriptionUpdateParams.builder()
                .setCancelAtPeriodEnd(false)
                .build();
        sub.update(params);
    }

    /**
     * Creates a SetupIntent for updating the payment method on file.
     *
     * @param stripeCustomerId the Stripe customer ID
     * @return the SetupIntent client secret
     * @throws StripeException if the Stripe API call fails
     */
    public String createSetupIntent(String stripeCustomerId) throws StripeException {
        SetupIntentCreateParams params = SetupIntentCreateParams.builder()
                .setCustomer(stripeCustomerId)
                .addPaymentMethodType("card")
                .build();
        SetupIntent intent = SetupIntent.create(params);
        return intent.getClientSecret();
    }

    /**
     * Verifies and constructs a Stripe webhook event from the raw payload.
     *
     * @param payload the raw request body
     * @param sigHeader the Stripe-Signature header
     * @return the verified Event
     * @throws StripeException if signature verification fails
     */
    public Event constructEvent(String payload, String sigHeader) throws StripeException {
        return Webhook.constructEvent(payload, sigHeader, stripeProperties.webhookSecret());
    }

    /**
     * Returns the set of valid price IDs from configuration.
     *
     * @return set of configured price IDs (excluding null/blank)
     */
    public Set<String> getValidPriceIds() {
        Set<String> ids = new java.util.HashSet<>();
        if (stripeProperties.priceIdMonthly() != null && !stripeProperties.priceIdMonthly().isBlank()) {
            ids.add(stripeProperties.priceIdMonthly());
        }
        if (stripeProperties.priceIdWeekly() != null && !stripeProperties.priceIdWeekly().isBlank()) {
            ids.add(stripeProperties.priceIdWeekly());
        }
        if (stripeProperties.priceIdDaily() != null && !stripeProperties.priceIdDaily().isBlank()) {
            ids.add(stripeProperties.priceIdDaily());
        }
        return ids;
    }
}
