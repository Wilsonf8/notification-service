/**
 * API functions for subscription billing operations.
 * @module lib/api/billing
 */

import { apiFetch } from "@/lib/auth";
import type {
  Subscription,
  CheckoutSessionResponse,
  SetupIntentResponse,
} from "@/lib/types";

/**
 * Fetches the subscription status for an organization.
 * @param slug - The organization slug
 * @returns The subscription status
 */
export async function getSubscriptionStatus(
  slug: string
): Promise<Subscription> {
  return apiFetch<Subscription>(
    `/api/organizations/${slug}/billing/status`
  );
}

/**
 * Creates a Stripe Subscription and returns the PaymentIntent client secret.
 * @param slug - The organization slug
 * @param priceId - The Stripe price ID
 * @returns The PaymentIntent client secret
 */
export async function createCheckoutSession(
  slug: string,
  priceId: string
): Promise<CheckoutSessionResponse> {
  return apiFetch<CheckoutSessionResponse>(
    `/api/organizations/${slug}/billing/checkout`,
    {
      method: "POST",
      body: JSON.stringify({ priceId }),
    }
  );
}

/**
 * Cancels the subscription at the end of the current billing period.
 * @param slug - The organization slug
 */
export async function cancelSubscription(slug: string): Promise<void> {
  await apiFetch(`/api/organizations/${slug}/billing/cancel`, {
    method: "POST",
  });
}

/**
 * Reactivates a subscription that was set to cancel at period end.
 * @param slug - The organization slug
 */
export async function reactivateSubscription(slug: string): Promise<void> {
  await apiFetch(`/api/organizations/${slug}/billing/reactivate`, {
    method: "POST",
  });
}

/**
 * Creates a SetupIntent for updating the payment method via Payment Element.
 * @param slug - The organization slug
 * @returns The SetupIntent client secret
 */
export async function createSetupIntent(
  slug: string
): Promise<SetupIntentResponse> {
  return apiFetch<SetupIntentResponse>(
    `/api/organizations/${slug}/billing/update-payment-method`,
    { method: "POST" }
  );
}
