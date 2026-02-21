/**
 * API functions for subscription billing operations.
 * @module lib/api/billing
 */

import { apiFetch } from "@/lib/auth";
import type {
  Subscription,
  CheckoutSessionResponse,
  SetupIntentResponse,
  InvoiceListResponse,
  UpcomingInvoice,
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
 * Upgrades a personal organization to a paid team organization.
 * Creates a Stripe subscription with upgrade metadata for the webhook to process.
 * @param slug - The organization slug
 * @param name - The new organization name (must differ from current)
 * @param priceId - The Stripe price ID
 * @returns The PaymentIntent client secret
 */
export async function upgradePersonalOrg(
  slug: string,
  name: string,
  priceId: string
): Promise<CheckoutSessionResponse> {
  return apiFetch<CheckoutSessionResponse>(
    `/api/organizations/${slug}/billing/upgrade`,
    {
      method: "POST",
      body: JSON.stringify({ name, priceId }),
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

/**
 * Fetches paginated invoices for an organization.
 * @param slug - The organization slug
 * @param limit - Maximum number of invoices to return
 * @param startingAfter - Invoice ID cursor for pagination
 * @returns The paginated invoice list
 */
export async function getInvoices(
  slug: string,
  limit?: number,
  startingAfter?: string
): Promise<InvoiceListResponse> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (startingAfter) params.set("startingAfter", startingAfter);
  const query = params.toString();
  return apiFetch<InvoiceListResponse>(
    `/api/organizations/${slug}/billing/invoices${query ? `?${query}` : ""}`
  );
}

/**
 * Fetches the upcoming invoice for an organization.
 * Returns null if no upcoming invoice exists (204 response).
 * @param slug - The organization slug
 * @returns The upcoming invoice or null
 */
export async function getUpcomingInvoice(
  slug: string
): Promise<UpcomingInvoice | null> {
  const result = await apiFetch<UpcomingInvoice>(
    `/api/organizations/${slug}/billing/upcoming`
  );
  // apiFetch returns {} for 204 responses
  if (!result || !("amountDue" in result)) {
    return null;
  }
  return result;
}
