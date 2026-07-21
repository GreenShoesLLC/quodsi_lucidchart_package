import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';

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

/**
 * Resolved entitlements for the current request as computed by
 * `quodsi_api`'s EntitlementService. This is a snapshot — the authoritative
 * state lives in Kinde.
 */
export interface EntitlementsStatusMessage extends EnvelopeBase {
  type: EnvelopeMessageType.ENTITLEMENTS_STATUS;
  data: {
    /** Whether the active plan comes from the user's org or the user directly. */
    subjectType: EntitlementSubjectType;

    /** Plan key (e.g. "quodsi_pro_user", "quodsi_pro_team"). */
    planKey: string;

    /** Active / trialing / etc. Used by the UI to decide whether to show a trial badge. */
    planStatus: EntitlementPlanStatus;

    /**
     * ISO timestamp of when the current trial expires. Present only when
     * planStatus === 'trialing'.
     */
    trialExpiresAt?: string;

    /**
     * Features the subject is entitled to.
     *   - Metered feature: value is `{ limit, used }`.
     *   - Unmetered feature: key is present with value `true`.
     *   - Absent: feature is not enabled.
     */
    features: Record<string, EntitlementMeteredFeature | boolean>;

    /** From backend BILLING_MODE; false => hide Upgrade UI. Absent => show (fail-open). */
    upgradeAvailable?: boolean;

    /**
     * The following fields mirror `quodsi_api`'s flat `GET /me/entitlements`
     * REST response (camelCased). All are OPTIONAL so older extension builds
     * (built against a prior envelope shape) keep compiling and working
     * against newer hosts/backends that don't yet send them.
     */

    /** Whether the resolved plan came from the user's org, the user directly, or the free fallback. */
    planSource?: EntitlementPlanSource;

    /** Display name of the org whose plan is active, or null when not org-scoped. */
    orgName?: string | null;

    /** Studies used so far in the current period, for study-keyed limits. */
    studiesUsed?: number;

    /** Max studies allowed per org (null = unlimited). */
    studiesPerOrgLimit?: number | null;

    /** Max scenarios allowed per study (null = unlimited). */
    scenariosPerStudyLimit?: number | null;

    /** Max replications allowed per scenario (null = unlimited). */
    replicationsPerScenarioLimit?: number | null;

    /** Whether the Tradeoff Analysis feature is enabled for the current plan. */
    tradeoffAnalysis?: boolean;

    /** Whether chart export is enabled for the current plan. */
    chartExport?: boolean;
  };
}

export type EntitlementMessage = EntitlementsStatusMessage;
