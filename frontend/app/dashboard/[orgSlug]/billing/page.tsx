/**
 * Billing page for managing organization subscription.
 * Uses Stripe Payment Element for embedded checkout and payment method updates.
 * Restricted to OWNER role only.
 * @module app/dashboard/[orgSlug]/billing/page
 */
"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconCreditCard,
  IconLoader,
  IconX,
  IconRefresh,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  getSubscriptionStatus,
  createCheckoutSession,
  cancelSubscription,
  reactivateSubscription,
  createSetupIntent,
} from "@/lib/api/billing";
import type { Subscription, SubscriptionStatus } from "@/lib/types";
import { useOrganization } from "@/lib/contexts/organization-context";
import { stripePromise } from "@/lib/stripe";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

/** Billing interval option */
interface BillingInterval {
  label: string;
  value: string;
  priceId: string;
  description: string;
}

/** Stripe Elements appearance for dark mode */
const stripeAppearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#c4a832",
    fontFamily: "JetBrains Mono, monospace",
    borderRadius: "0px",
  },
};

/**
 * Returns badge variant based on subscription status.
 */
function getStatusBadgeVariant(
  status: SubscriptionStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "PAST_DUE":
      return "secondary";
    case "CANCELED":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Checkout form rendered inside the Elements provider.
 * Handles confirmPayment for new subscriptions.
 */
function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "Payment failed");
      setSubmitting(false);
    } else {
      toast.success("Subscription activated!");
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full gap-2"
      >
        {submitting ? (
          <IconLoader className="h-4 w-4 animate-spin" />
        ) : (
          <IconCreditCard className="h-4 w-4" />
        )}
        Subscribe
      </Button>
    </form>
  );
}

/**
 * Update payment method form rendered inside the Elements provider.
 * Handles confirmSetup for payment method updates.
 */
function UpdatePaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "Failed to update payment method");
      setSubmitting(false);
    } else {
      toast.success("Payment method updated!");
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full gap-2"
      >
        {submitting ? (
          <IconLoader className="h-4 w-4 animate-spin" />
        ) : (
          <IconCreditCard className="h-4 w-4" />
        )}
        Update Payment Method
      </Button>
    </form>
  );
}

/**
 * Billing page component for managing organization subscriptions.
 * OWNER-only access with embedded Stripe Payment Element.
 */
export default function BillingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const { currentOrg } = useOrganization();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState("monthly");

  // Dialog state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [updatePaymentOpen, setUpdatePaymentOpen] = useState(false);
  const [updatePaymentClientSecret, setUpdatePaymentClientSecret] = useState<string | null>(null);
  const [updatePaymentLoading, setUpdatePaymentLoading] = useState(false);

  const intervals: BillingInterval[] = [
    {
      label: "Monthly",
      value: "monthly",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || "",
      description: "$10/month",
    },
    {
      label: "Weekly (testing)",
      value: "weekly",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_WEEKLY || "",
      description: "$10/week",
    },
    {
      label: "Daily (testing)",
      value: "daily",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_DAILY || "",
      description: "$10/day",
    },
  ].filter((i) => i.priceId);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSubscriptionStatus(orgSlug);
      setSubscription(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load billing status"
      );
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  /**
   * Handles checkout: creates subscription and opens Payment Element dialog.
   */
  const handleCheckout = async () => {
    const interval = intervals.find((i) => i.value === selectedInterval);
    if (!interval) return;

    try {
      setCheckoutLoading(true);
      const { clientSecret } = await createCheckoutSession(
        orgSlug,
        interval.priceId
      );
      setCheckoutClientSecret(clientSecret);
      setCheckoutOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start checkout"
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  /**
   * Handles cancel subscription at period end.
   */
  const handleCancel = async () => {
    try {
      setCancelLoading(true);
      await cancelSubscription(orgSlug);
      toast.success("Subscription will cancel at the end of the billing period");
      await fetchStatus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel subscription"
      );
    } finally {
      setCancelLoading(false);
    }
  };

  /**
   * Handles reactivating a subscription pending cancellation.
   */
  const handleReactivate = async () => {
    try {
      setReactivateLoading(true);
      await reactivateSubscription(orgSlug);
      toast.success("Subscription reactivated");
      await fetchStatus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reactivate subscription"
      );
    } finally {
      setReactivateLoading(false);
    }
  };

  /**
   * Handles update payment method: creates SetupIntent and opens dialog.
   */
  const handleUpdatePaymentMethod = async () => {
    try {
      setUpdatePaymentLoading(true);
      const { clientSecret } = await createSetupIntent(orgSlug);
      setUpdatePaymentClientSecret(clientSecret);
      setUpdatePaymentOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to start payment method update"
      );
    } finally {
      setUpdatePaymentLoading(false);
    }
  };

  const isActive =
    subscription?.status === "ACTIVE" || subscription?.status === "PAST_DUE";
  const isOwner = currentOrg?.userRole === "OWNER";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-4">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subscription Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>
                Manage your organization&apos;s LiveConnect subscription
              </CardDescription>
            </div>
            <Badge
              variant={getStatusBadgeVariant(
                subscription?.status || "INACTIVE"
              )}
            >
              {subscription?.status || "INACTIVE"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isActive ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {subscription?.currentPeriodStart && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Current period start
                    </p>
                    <p className="text-sm">
                      {new Date(
                        subscription.currentPeriodStart
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {subscription?.currentPeriodEnd && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Current period end
                    </p>
                    <p className="text-sm">
                      {new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {subscription?.cancelAtPeriodEnd && (
                <div className="bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">
                    Your subscription will cancel at the end of the current
                    billing period on{" "}
                    {subscription.currentPeriodEnd
                      ? new Date(
                          subscription.currentPeriodEnd
                        ).toLocaleDateString()
                      : "the period end"}
                    . Your widgets will stop working after this date.
                  </p>
                </div>
              )}

              {subscription?.status === "PAST_DUE" && (
                <div className="bg-yellow-500/10 p-3">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Your payment is past due. Please update your payment method
                    to avoid service interruption.
                  </p>
                </div>
              )}

              {isOwner && (
                <div className="flex flex-wrap gap-2">
                  {subscription?.cancelAtPeriodEnd ? (
                    <Button
                      variant="outline"
                      onClick={handleReactivate}
                      disabled={reactivateLoading}
                      className="gap-2"
                    >
                      {reactivateLoading ? (
                        <IconLoader className="h-4 w-4 animate-spin" />
                      ) : (
                        <IconRefresh className="h-4 w-4" />
                      )}
                      Reactivate Subscription
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={cancelLoading}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      {cancelLoading ? (
                        <IconLoader className="h-4 w-4 animate-spin" />
                      ) : (
                        <IconX className="h-4 w-4" />
                      )}
                      Cancel Subscription
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleUpdatePaymentMethod}
                    disabled={updatePaymentLoading}
                    className="gap-2"
                  >
                    {updatePaymentLoading ? (
                      <IconLoader className="h-4 w-4 animate-spin" />
                    ) : (
                      <IconCreditCard className="h-4 w-4" />
                    )}
                    Update Payment Method
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {subscription?.status === "CANCELED"
                  ? "Your subscription has been canceled. Subscribe again to re-activate your widgets."
                  : "Subscribe to activate LiveConnect widgets for all projects in this organization."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscribe Card (when inactive) */}
      {!isActive && isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconCreditCard className="h-5 w-5" />
              LiveConnect Plan
            </CardTitle>
            <CardDescription>
              Unlimited projects and widgets for your entire organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">$10</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>All projects covered under one subscription</li>
                <li>Unlimited embed keys</li>
                <li>Unlimited visitor sessions</li>
                <li>Video calls with LiveKit</li>
              </ul>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {intervals.length > 1 && (
                  <Select
                    value={selectedInterval}
                    onValueChange={(val) => val && setSelectedInterval(val)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {intervals.map((interval) => (
                        <SelectItem key={interval.value} value={interval.value}>
                          {interval.label} — {interval.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || !intervals.length}
                  className="gap-2"
                >
                  {checkoutLoading ? (
                    <IconLoader className="h-4 w-4 animate-spin" />
                  ) : (
                    <IconCreditCard className="h-4 w-4" />
                  )}
                  Subscribe
                </Button>
              </div>

              {!intervals.length && (
                <p className="text-xs text-destructive">
                  No pricing configured. Set
                  NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY in your environment.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkout Dialog — Payment Element for new subscriptions */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Subscription</DialogTitle>
            <DialogDescription>
              Enter your payment details to activate your subscription.
            </DialogDescription>
          </DialogHeader>
          {checkoutClientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: checkoutClientSecret,
                appearance: stripeAppearance,
              }}
            >
              <CheckoutForm
                onSuccess={() => {
                  setCheckoutOpen(false);
                  setCheckoutClientSecret(null);
                  fetchStatus();
                }}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Payment Method Dialog */}
      <Dialog open={updatePaymentOpen} onOpenChange={setUpdatePaymentOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Payment Method</DialogTitle>
            <DialogDescription>
              Enter your new payment details.
            </DialogDescription>
          </DialogHeader>
          {updatePaymentClientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: updatePaymentClientSecret,
                appearance: stripeAppearance,
              }}
            >
              <UpdatePaymentForm
                onSuccess={() => {
                  setUpdatePaymentOpen(false);
                  setUpdatePaymentClientSecret(null);
                }}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
