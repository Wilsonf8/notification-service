/**
 * Stripe client-side initialization.
 * @module lib/stripe
 */

import { loadStripe } from "@stripe/stripe-js";

/** Shared Stripe promise for use with Elements provider. */
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);
