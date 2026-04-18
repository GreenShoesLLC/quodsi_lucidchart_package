import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';

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
  };
}

export type EntitlementMessage = EntitlementsStatusMessage;
