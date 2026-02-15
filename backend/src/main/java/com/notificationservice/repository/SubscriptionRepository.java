package com.notificationservice.repository;

import com.notificationservice.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for managing organization subscriptions.
 */
public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    /**
     * Finds a subscription by organization ID.
     * @param organizationId the organization's ID
     * @return the subscription if it exists
     */
    Optional<Subscription> findByOrganizationId(UUID organizationId);

    /**
     * Finds a subscription by its Stripe subscription ID.
     * @param stripeSubscriptionId the Stripe subscription ID
     * @return the subscription if it exists
     */
    Optional<Subscription> findByStripeSubscriptionId(String stripeSubscriptionId);
}
