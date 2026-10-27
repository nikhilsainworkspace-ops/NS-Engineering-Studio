# Billing and payment integration boundary

## Current confirmed state

Neither supplied source project contains a verified, activated payment-provider integration with credentials and end-to-end test evidence. The merge therefore does **not** expose checkout, subscription creation, recurring billing, payment-success callbacks, invoice payment or refund actions. The admin Billing page shows the actual disabled state. No endpoint pretends that payment succeeded.

## Environment template

- `PAYMENT_PROVIDER=disabled` — remains disabled until a provider-specific adapter is implemented, security-reviewed and tested.
- `PAYMENT_API_KEY=` — placeholder reserved for the provider's server-side API key/identifier.
- `PAYMENT_API_SECRET=` — placeholder reserved for the server-side signing/secret value.
- `PAYMENT_WEBHOOK_SECRET=` — placeholder reserved for webhook signature verification.

These generic variables are documentation/activation placeholders only. Setting a provider name or secret does not activate billing because no provider adapter is included in this release. Do not put secret values in `NEXT_PUBLIC_*` variables or client bundles.

## Required provider decision and implementation gate

Before choosing an adapter, the owner must confirm the legal merchant entity, business category, account ownership, supported currencies, settlement details, subscription model, tax/invoice requirements, cancellation/refund terms and supported customer locations. The current application has a central administrator session but does not yet provide a customer identity/subscription-entitlement model suitable for paid checkout, so that model must be implemented before a customer payment endpoint is exposed.

A provider-specific implementation must create orders/subscriptions server-side, verify checkout signatures, verify webhook signatures over the exact raw body, deduplicate webhook event IDs with a unique database index, validate amount/currency/order/customer mappings, use idempotent state transitions, reject replayed or mismatched events, log safe audit events, handle cancellations/refunds and reconcile provider state. Product access must be granted or revoked on the server only after verified payment/provider state. No secret or signing decision may be trusted from a browser request.

## Test plan before enabling

Use provider sandbox credentials only. Test success, failure, pending state, duplicate webhook, invalid signature, malformed body, currency/amount mismatch, replay, cancellation, refund, plan downgrade/expiry, renewal, webhook reordering, timeout/retry and database outage. Verify entitlement enforcement against APIs—not just UI buttons—and complete a staging rollback/reconciliation drill. Update `TEST_REPORT.md` with actual results before enabling production billing.
