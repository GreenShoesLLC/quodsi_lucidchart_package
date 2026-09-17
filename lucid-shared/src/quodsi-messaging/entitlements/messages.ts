/**
 * Whose plan is being enforced on this request — the user's personal plan,
 * or the org's plan (which takes precedence when a user belongs to an org
 * with an active/trialing subscription).
 */
export type EntitlementSubjectType = 'user' | 'organization';

/**
 * Where the active plan resolution came from, as computed by the backend's
 * EntitlementService. Mirrors `quodsi_api`'s flat REST field `plan_source`.
 */
export type EntitlementPlanSource = 'kinde_org' | 'kinde_user' | 'free_fallback';

/**
 * Plan status mirrors Kinde. `trialing` grants full entitlements like
 * `active` — only `expired` downgrades the user to free defaults.
 */
export type EntitlementPlanStatus = 'active' | 'trialing' | 'in_grace' | 'expired';

/**
 * Shape of a single metered feature as returned from the backend's
 * `GET /me/entitlements`. For unmetered features, the key is simply
 * present in the `features` map with a truthy value.
 */
export interface EntitlementMeteredFeature {
  limit: number;
  used: number;
}
