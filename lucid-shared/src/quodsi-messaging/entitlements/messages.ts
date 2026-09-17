import type { EntitlementPlanSource } from '@quodsi/shared';

/**
 * Whose plan is being enforced on this request — the user's personal plan,
 * or the org's plan (which takes precedence when a user belongs to an org
 * with an active/trialing subscription).
 */
export type EntitlementSubjectType = 'user' | 'organization';


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

/**
 * ENTITLEMENTS_STATUS payload (host -> panel). quodsi_api's GetMyEntitlements
 * data action returns exactly this shape (camelCase end to end), and the host
 * forwards it unchanged. The fields after `upgradeAvailable` are optional so
 * an older backend that doesn't send them still works.
 */
export interface EntitlementsStatusData {
  subjectType: EntitlementSubjectType;
  planKey: string;
  planStatus: EntitlementPlanStatus;
  trialExpiresAt?: string;
  /** Metered features as { limit, used }; unmetered flags as `true`. Absent key = feature disabled. */
  features: Record<string, EntitlementMeteredFeature | boolean>;
  upgradeAvailable?: boolean;
  planSource?: EntitlementPlanSource;
  orgName?: string | null;
  studiesUsed?: number;
  studiesPerOrgLimit?: number | null;
  scenariosPerStudyLimit?: number | null;
  replicationsPerScenarioLimit?: number | null;
  tradeoffAnalysis?: boolean;
  chartExport?: boolean;
}
