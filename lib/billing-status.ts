export type BillingStatus = {
  provider: string;
  mode: "disabled" | "configuration-pending";
  checkoutEnabled: false;
  message: string;
  requiredBeforeActivation: string[];
};

/** No payment provider was configured in either source archive; never simulate successful checkout. */
export function getBillingStatus(): BillingStatus {
  const configuredProvider = (process.env.PAYMENT_PROVIDER || "disabled").trim().toLowerCase();
  const providerName = configuredProvider && configuredProvider !== "disabled" ? configuredProvider : "No provider selected";
  const mode = configuredProvider === "disabled" ? "disabled" : "configuration-pending";
  return {
    provider: providerName,
    mode,
    checkoutEnabled: false,
    message: mode === "disabled"
      ? "Checkout, subscriptions, invoices and payment webhooks are disabled. No provider adapter or credentials were present in the supplied projects."
      : "A provider name is configured, but this build contains no matching verified payment adapter. Checkout remains disabled until the adapter, signatures, idempotency, entitlements and webhook tests are implemented and verified.",
    requiredBeforeActivation: [
      "Select a provider and confirm the merchant account owner.",
      "Implement server-side order/subscription creation and signature-verified webhook handling.",
      "Persist orders and webhook event IDs with unique indexes and idempotent status transitions.",
      "Enforce customer identity and subscription entitlements server-side.",
      "Test success, failure, duplicate events, refunds, cancellations and reconciliation in provider test mode.",
      "Configure verified terms, pricing, refund/cancellation rules and support contacts."
    ]
  };
}
