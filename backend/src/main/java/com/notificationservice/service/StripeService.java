package com.notificationservice.service;

import com.notificationservice.config.StripeProperties;
import com.notificationservice.dto.InvoiceDto;
import com.notificationservice.dto.InvoiceListResponse;
import com.notificationservice.dto.UpcomingInvoiceDto;
import com.notificationservice.entity.Organization;
import com.notificationservice.repository.OrganizationRepository;
import com.stripe.Stripe;
import com.stripe.exception.InvalidRequestException;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.InvoiceLineItemCollection;
import com.stripe.model.PaymentIntent;
import com.stripe.model.PaymentMethod;
import com.stripe.model.SetupIntent;
import com.stripe.model.Subscription;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.CustomerRetrieveParams;
import com.stripe.param.CustomerUpdateParams;
import com.stripe.param.InvoiceListParams;
import com.stripe.param.InvoiceUpcomingParams;
import com.stripe.param.SetupIntentCreateParams;
import com.stripe.param.SubscriptionCreateParams;
import com.stripe.param.SubscriptionUpdateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
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
     * Creates a Stripe Subscription with upgrade metadata for personal-to-team conversion.
     * The metadata is read by the webhook handler to perform the org conversion on payment success.
     *
     * @param org the organization
     * @param priceId the Stripe price ID to subscribe to
     * @param upgradeName the new organization name after upgrade
     * @param upgradeSlug the new organization slug after upgrade
     * @return the subscription result with client secret and subscription ID
     * @throws StripeException if the Stripe API call fails
     */
    public SubscriptionResult createSubscriptionWithUpgradeMetadata(
            Organization org, String priceId, String upgradeName, String upgradeSlug) throws StripeException {
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
                .putMetadata("upgradeOrgName", upgradeName)
                .putMetadata("upgradeOrgSlug", upgradeSlug)
                .addExpand("latest_invoice.payment_intent")
                .build();

        Subscription stripeSub = Subscription.create(params);
        Invoice invoice = stripeSub.getLatestInvoiceObject();
        PaymentIntent paymentIntent = invoice.getPaymentIntentObject();

        log.info("Created upgrade subscription {} for personal org {}", stripeSub.getId(), org.getSlug());
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
     * Updates the name of a Stripe customer.
     *
     * @param customerId the Stripe customer ID
     * @param newName the new customer name
     * @throws StripeException if the Stripe API call fails
     */
    public void updateCustomerName(String customerId, String newName) throws StripeException {
        Customer customer = Customer.retrieve(customerId);
        CustomerUpdateParams params = CustomerUpdateParams.builder()
                .setName(newName)
                .build();
        customer.update(params);
        log.info("Updated Stripe customer {} name to '{}'", customerId, newName);
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

    /**
     * Lists paid invoices for a Stripe customer with cursor-based pagination.
     *
     * @param stripeCustomerId the Stripe customer ID
     * @param limit the maximum number of invoices to return
     * @param startingAfter the invoice ID to start after (for pagination), nullable
     * @return paginated invoice list response
     * @throws StripeException if the Stripe API call fails
     */
    public InvoiceListResponse listInvoices(String stripeCustomerId, int limit, String startingAfter)
            throws StripeException {
        InvoiceListParams.Builder paramsBuilder = InvoiceListParams.builder()
                .setCustomer(stripeCustomerId)
                .setLimit((long) limit);

        if (startingAfter != null && !startingAfter.isBlank()) {
            paramsBuilder.setStartingAfter(startingAfter);
        }

        var invoiceCollection = Invoice.list(paramsBuilder.build());
        List<InvoiceDto> invoiceDtos = new ArrayList<>();

        for (Invoice invoice : invoiceCollection.getData()) {
            invoiceDtos.add(new InvoiceDto(
                    invoice.getId(),
                    invoice.getCreated(),
                    buildInvoiceDescription(invoice),
                    invoice.getAmountDue(),
                    invoice.getAmountPaid(),
                    invoice.getCurrency(),
                    invoice.getStatus(),
                    invoice.getInvoicePdf(),
                    invoice.getHostedInvoiceUrl()
            ));
        }

        String nextCursor = invoiceDtos.isEmpty() ? null
                : invoiceDtos.get(invoiceDtos.size() - 1).id();

        return new InvoiceListResponse(invoiceDtos, invoiceCollection.getHasMore(), nextCursor);
    }

    /**
     * Retrieves the upcoming invoice for a Stripe customer, including payment card details.
     *
     * @param stripeCustomerId the Stripe customer ID
     * @return the upcoming invoice DTO, or null if no upcoming invoice exists
     * @throws StripeException if the Stripe API call fails (except InvalidRequestException for no upcoming invoice)
     */
    public UpcomingInvoiceDto getUpcomingInvoice(String stripeCustomerId) throws StripeException {
        Invoice upcoming;
        try {
            InvoiceUpcomingParams params = InvoiceUpcomingParams.builder()
                    .setCustomer(stripeCustomerId)
                    .build();
            upcoming = Invoice.upcoming(params);
        } catch (InvalidRequestException e) {
            // No upcoming invoice (e.g. no active subscription)
            return null;
        }

        String cardBrand = null;
        String cardLast4 = null;
        try {
            CustomerRetrieveParams customerParams = CustomerRetrieveParams.builder()
                    .addExpand("invoice_settings.default_payment_method")
                    .build();
            Customer customer = Customer.retrieve(stripeCustomerId, customerParams, null);
            PaymentMethod pm = customer.getInvoiceSettings().getDefaultPaymentMethodObject();
            if (pm != null && pm.getCard() != null) {
                cardBrand = pm.getCard().getBrand();
                cardLast4 = pm.getCard().getLast4();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch card details for customer {}: {}", stripeCustomerId, e.getMessage());
        }

        return new UpcomingInvoiceDto(
                upcoming.getAmountDue(),
                upcoming.getCurrency(),
                upcoming.getNextPaymentAttempt(),
                buildInvoiceDescription(upcoming),
                cardBrand,
                cardLast4
        );
    }

    /**
     * Extracts a human-readable description from an invoice.
     * Uses the first line item description or falls back to the invoice number.
     *
     * @param invoice the Stripe invoice
     * @return a description string
     */
    private String buildInvoiceDescription(Invoice invoice) {
        InvoiceLineItemCollection lines = invoice.getLines();
        if (lines != null && lines.getData() != null && !lines.getData().isEmpty()) {
            String desc = lines.getData().get(0).getDescription();
            if (desc != null && !desc.isBlank()) {
                return desc;
            }
        }
        return invoice.getNumber() != null ? invoice.getNumber() : "Invoice";
    }
}
