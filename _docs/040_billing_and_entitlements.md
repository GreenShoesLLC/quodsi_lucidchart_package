# 040 — Billing & Entitlements (Kinde)

> **⚠️ PARTIALLY SUPERSEDED** (banner added 2026-07-10). For the current implementation state of
> Kinde billing/entitlements, see the **quodsi monorepo** docs `_docs/kinde-entitlements.md`
> (audited 2026-07-10) and `_docs/kinde-environments.md` (tenants / plans). This runbook keeps
> useful operator how-to (plan CRUD, webhook debugging), but some specifics below are stale — e.g.
> legacy plan names and the removed `scenario_studies` feature (replaced by the metered
> `scenarios_per_model` on 2026-05-01). Verify against the monorepo docs + code before relying on
> details here.

Operator runbook for Quodsi's Kinde-backed billing and feature entitlements.

## What this covers

- Plan/feature CRUD in the Kinde dashboard
- Where enforcement lives in `quodsi_api`
- How to debug webhooks in dev, test, and prod
- User ↔ org billing transitions
- Adding a new entitlement from scratch

## System shape (one screen)

```
LucidChart extension → quodsi_api (/scenarios/{id}/runs)
                         ├── get_current_user_and_entitlements
                         │     (org-first resolve, user fallback, free fallback)
                         ├── check_can_submit_run   → 402 if over monthly quota
                         ├── scenario_run_service.record_run
                         ├── entitlement_service.record_run_submitted (local counter)
                         └── entitlement_service.record_run_completed (posts to Kinde)

Kinde webhooks → quodsi_api (/api/kinde/webhook)
                   └── upsert users/organizations plan_key/status, audit row
```

Kinde owns plans, Stripe customers, and the authoritative entitlement state. We cache per-subject (`users.entitlements_json` or `organizations.entitlements_json`) for `ENTITLEMENT_CACHE_TTL_SECONDS` (default 300) so we don't pay a Kinde round-trip on every request.

## Plan setup in Kinde

Two plan groups (you cannot mix user and org plans in one group):

- **"Quodsi Individuals"** (type: Users)
  - `quodsi_free_user` — $0
  - `quodsi_pro_user` — monthly + annual
- **"Quodsi Teams"** (type: Organizations)
  - `quodsi_pro_team` — per-seat or flat
  - `quodsi_enterprise_team` — custom

Feature keys (same across both groups so enforcement code doesn't branch):

| Feature | Type | Individual limits | Team limits |
|---------|------|-------------------|-------------|
| `simulations_per_month` | Metered, non-chargeable | 10 / 200 | 1000 / unlimited (pooled per org) |
| `scenario_studies` | Unmetered (presence = enabled) | Off on Free / On on Pro | On everywhere |

Plans only become purchasable after a **Stripe connection** on the Kinde billing dashboard.

## Environment configuration

Settings live in `quodsim/quodsi_api/app/config.py`:

- `KINDE_ISSUER_URL` — used for access-token JWKS (existing)
- `KINDE_AUDIENCE` — used for access-token audience check (existing)
- `KINDE_M2M_CLIENT_ID` / `KINDE_M2M_CLIENT_SECRET` — for Management API calls
- `KINDE_MANAGEMENT_API_BASE` — defaults to `KINDE_ISSUER_URL`; same host
- `KINDE_WEBHOOK_JWKS_URI` — separate JWKS for verifying webhook signatures
- `ENTITLEMENT_CACHE_TTL_SECONDS` — default 300

M2M app is created in the Kinde console; grant scopes `read:billing_entitlements`, `read:user_subscriptions`, `read:organization_subscriptions`, `update:user_subscriptions`, `update:organization_subscriptions`, `create:metered_usage`.

## Where enforcement lives

| Concern | File |
|---------|------|
| Resolver (org-first → user → free) | `app/services/entitlement_service.py` |
| Billing-API client | `app/services/kinde_billing_client.py` |
| FastAPI dependency | `app/auth/dependencies.py::get_current_user_and_entitlements` |
| Run-submission gate | `app/routers/scenario_runs_router.py` |
| Scenario-creation gate | `app/routers/scenarios_router.py` (2nd+ scenario only) |
| Webhook receiver | `app/routers/kinde_webhooks.py` → `POST /api/kinde/webhook` |
| Subscription audit | `subscription_events` table |

Free users always get the baseline scenario. Enforcement kicks in on the **2nd** scenario on a model. The submission endpoint is never gated on `scenario_studies`; it is only gated on the monthly count.

## Kinde event vocabulary

Kinde uses three event families relevant to us:

| Family | Events we subscribe to | What we do |
|--------|-----------------------|------------|
| `customer.*` (billing) | `agreement_created`, `agreement_cancelled`, `plan_assigned`, `plan_changed`, `meter_usage_updated`, `payment_failed`, `payment_succeeded`, `invoice_overdue` | Update users/organizations plan cache |
| `organization.*` | `created`, `updated`, `deleted` | Keep org row and name in sync |
| `user.*` | `created`, `updated`, `deleted` | Keep user row in sync |

Kinde calls a subscription a "billing agreement." The `customer` in `customer.*` events is either a user or an org — the payload tells us which via the presence of `kinde_org_code`.

Kinde does not emit discrete `trial.ended` events — trial transitions surface as `customer.plan_changed` with an updated `status` field, which our generic handler picks up.

Kinde does not emit org-membership events. When a user's org membership changes in Kinde, we don't know until their next authenticated request refreshes the `org_code` claim from the JWT and `user_service.upsert_from_kinde_claims` syncs it.

## Debugging webhooks

1. Kinde retries on non-2xx. Our handler returns **200 even on unknown event types** to prevent retry storms — audit rows with `processing_error IS NOT NULL` are the actual failures.
2. Query recent events:
   ```sql
   SELECT TOP 50 event_type, subject_type, kinde_subject_id,
                 processed_at, processing_error
     FROM subscription_events
    ORDER BY received_at DESC;
   ```
3. A bad signature returns 401 and writes **nothing** — if a webhook disappears entirely, it's a signature / JWKS issue. Check `KINDE_WEBHOOK_JWKS_URI` points at the webhook keys endpoint (different from the access-token JWKS).
4. Locally, signatures can be bypassed in tests by patching `app.routers.kinde_webhooks._verify_webhook_jwt` — see `tests/test_kinde_webhooks.py`.

## User ↔ org transitions

- **User joins an org**: webhook `user.added_to_org` sets `users.kinde_org_code` and invalidates their entitlement cache. The next request resolves through the org.
- **User leaves an org**: webhook `user.removed_from_org` clears `kinde_org_code` — resolver falls back to the user's personal plan (or free).
- **Org plan cancelled**: resolver skips the org (status must be `active` or `trialing`), falls back to user plan.
- **Trialing**: treated identically to `active`. Downgrade only when a `*.trial.ended` webhook explicitly arrives.

The user's **currently active org context** comes from the JWT's `org_code` claim on every request. Multi-org users switch context by re-authenticating against a different org.

## Adding a new entitlement

1. In Kinde: add the feature to each plan in both plan groups. Same feature key across groups.
2. In `entitlement_service.py`: if it's a new metered feature, add a gate method (`check_can_X(resolved)`). Unmetered features need only `resolved.has("my_key")`.
3. Wire the gate call in the router.
4. For metered features, also call `record_*_metered_usage` on the billing client at the point consumption happens.
5. Update the extension's `ENTITLEMENTS_STATUS` message type to carry the new shape.

## Counter reset

- Local counters (`simulations_used_this_period`) reset when the stored `simulations_period_start` is in an earlier month than `now()`.
- Plan change webhooks reset the counter immediately.
- Kinde's authoritative counter resets on Stripe's billing cycle. Our cache TTL (5 min) means the UI may briefly show stale "used" numbers across the month boundary.

## Pre-Stripe (plans unpublished)

While plans are still drafts in Kinde:
- `getEntitlements()` returns empty for every user → resolver falls through to free defaults.
- Webhooks don't fire (no subscriptions to change).
- Unit tests cover all logic with mocked `KindeBillingClient`.
- `POST /api/kinde/webhook` still validates signatures and returns 401 on bad input, so the 401 path can be exercised.

Verification of real plan reads, metered reporting, trial flows, and pooled counters requires Stripe to be connected.
