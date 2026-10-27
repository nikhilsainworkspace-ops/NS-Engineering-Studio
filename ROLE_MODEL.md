# Identity and Role Model — Current State and Next Gate

## Current active access

The supplied codebases did not contain a verified, unified multi-user authentication system with individual customer credentials, password reset, email verification, per-user role assignment and per-record customer entitlements. The merged implementation therefore uses one environment-configured administrator identity and one central NS server-side session. The Civil at Hand workspace checks that same session rather than issuing a second `cah_session` cookie.

The active account is bootstrapped through `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` and `AUTH_SECRET`. This credential has full administrator access and must be protected as a Super Admin. Do not use it for normal customer or support-staff accounts.

## Proposed roles (not yet enabled)

| Role | Intended permissions | Activation state |
|---|---|---|
| Super Admin | Global settings, security, integrations, identity administration and all modules | Current single admin identity |
| Admin | Operational administration; no unrestricted credential/security ownership by default | Not enabled |
| Content Manager | Approved public pages, services, FAQs and software descriptions | Not enabled |
| Project Manager | Project CRUD and project-linked enquiries | Not enabled |
| Support Staff | Assigned enquiries and support records only | Not enabled |
| Customer | Own profile, own subscriptions and explicitly entitled applications only | Customer identity system not present |

## Required implementation before multi-user or customer launch

1. Add a persisted account model with individually salted password hashes, verified email, status, role and recovery state; import existing users only after reviewing actual source records and password-hash compatibility.
2. Extend the canonical session to capture the authenticated account ID and role version. Revoke sessions when accounts are disabled, credentials change or role grants are reduced.
3. Store permission grants server-side and enforce them in every API/action, not only by hiding controls. Use object-level ownership checks for enquiries, uploads, subscriptions, invoices and saved product data.
4. Add guarded bootstrap for the first Super Admin, admin-managed invitation/role changes, audit events, rate-limited password reset, email verification and optional MFA policies.
5. Test cross-role negative cases: a content manager cannot edit users/security/payment configuration; project managers cannot see unrelated customer records; customers cannot fetch another user's data by changing IDs, URLs or filters.
6. Only then activate customer subscription entitlements and provider-backed billing. See `PAYMENTS_INTEGRATION.md`.

The role table shown in `/admin/roles` is an inventory, not an active set of role grants. No additional role can be assigned through the current UI.
