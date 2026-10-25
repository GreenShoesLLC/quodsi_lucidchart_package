import {
  EntitlementMeteredFeature,
  EntitlementPlanSource,
  EntitlementPlanStatus,
  EntitlementSubjectType,
  EntitlementsStatusData,
  formatPlanName,
  getLogger,
  PLAN_FREE,
} from '@quodsi/lucid-shared';

const logger = getLogger('EntitlementsSlice');

export interface EntitlementsState {
  /** Whether the host has delivered an ENTITLEMENTS_STATUS yet. */
  loaded: boolean;
  /** user or organization — determines whose plan is shown in the UI. */
  subjectType: EntitlementSubjectType | null;
  planKey: string | null;
  planStatus: EntitlementPlanStatus | null;
  trialExpiresAt: string | null;
  /** Metered features as { limit, used }; unmetered flags as `true`. Absent key = feature disabled. */
  features: Record<string, EntitlementMeteredFeature | boolean>;
  /** Whether an upgrade is available for the current plan. null = unknown (fail-open: treat as "show"). */
  upgradeAvailable: boolean | null;

  // ---- New study-keyed / org-context fields (all optional on the wire;
  // safe defaults below so old hosts that don't send them still work). ----

  /** Whether the active plan resolved from the user's org, the user directly, or the free fallback. */
  planSource: EntitlementPlanSource | null;
  /** Display name of the org whose plan is active, or null when not org-scoped / unknown. */
  orgName: string | null;
  /** Studies used so far in the current period. null = unknown (old host). */
  studiesUsed: number | null;
  /** Max studies allowed per org. null = unlimited / unknown. */
  studiesPerOrgLimit: number | null;
  /** Max scenarios allowed per study. null = unlimited / unknown. */
  scenariosPerStudyLimit: number | null;
  /** Max replications allowed per scenario. null = unlimited / unknown. */
  replicationsPerScenarioLimit: number | null;
  /** Whether Tradeoff Analysis is enabled for the current plan. null = unknown (old host). */
  tradeoffAnalysis: boolean | null;
  /** Whether chart export is enabled for the current plan. null = unknown (old host). */
  chartExport: boolean | null;
}

export const initialEntitlementsState: EntitlementsState = {
  loaded: false,
  subjectType: null,
  planKey: null,
  planStatus: null,
  trialExpiresAt: null,
  features: {},
  upgradeAvailable: null,
  planSource: null,
  orgName: null,
  studiesUsed: null,
  studiesPerOrgLimit: null,
  scenariosPerStudyLimit: null,
  replicationsPerScenarioLimit: null,
  tradeoffAnalysis: null,
  chartExport: null,
};

export type EntitlementsAction =
  | ({ type: 'ENTITLEMENTS_STATUS_UPDATE' } & EntitlementsStatusData)
  | { type: 'ENTITLEMENTS_CLEAR' };

export function entitlementsReducer(
  state: EntitlementsState = initialEntitlementsState,
  action: EntitlementsAction
): EntitlementsState {
  switch (action.type) {
    case 'ENTITLEMENTS_STATUS_UPDATE':
      logger.debug('ENTITLEMENTS_STATUS_UPDATE:', {
        subjectType: action.subjectType,
        planKey: action.planKey,
        planStatus: action.planStatus,
      });
      return {
        loaded: true,
        subjectType: action.subjectType,
        planKey: action.planKey,
        planStatus: action.planStatus,
        trialExpiresAt: action.trialExpiresAt ?? null,
        features: action.features,
        upgradeAvailable: action.upgradeAvailable ?? null,
        planSource: action.planSource ?? null,
        orgName: action.orgName ?? null,
        studiesUsed: action.studiesUsed ?? null,
        studiesPerOrgLimit: action.studiesPerOrgLimit ?? null,
        scenariosPerStudyLimit: action.scenariosPerStudyLimit ?? null,
        replicationsPerScenarioLimit: action.replicationsPerScenarioLimit ?? null,
        tradeoffAnalysis: action.tradeoffAnalysis ?? null,
        chartExport: action.chartExport ?? null,
      };
    case 'ENTITLEMENTS_CLEAR':
      return initialEntitlementsState;
    default:
      return state;
  }
}

// ---- Selectors ----

/** Can the user submit another simulation this month? */
export function canSubmitSimulation(state: EntitlementsState): boolean {
  if (!state.loaded) return true; // no data yet — don't block the UI
  const f = state.features['simulations_per_month'];
  if (typeof f === 'object' && f !== null && 'limit' in f) {
    return f.used < f.limit;
  }
  return true;
}

/** Remaining runs this month (null when unmetered/unlimited). */
export function simulationsRemaining(state: EntitlementsState): number | null {
  const f = state.features['simulations_per_month'];
  if (typeof f === 'object' && f !== null && 'limit' in f) {
    return Math.max(0, f.limit - f.used);
  }
  return null;
}

/**
 * Usage snapshot ({ used, limit }) for the metered `simulations_per_month`
 * feature, for PlanDetails's "Runs this month" row. Null when
 * the feature is unmetered (flag `true`) or absent — the row is hidden in
 * that case rather than guessing a display value.
 */
export function simulationsUsage(
  state: EntitlementsState
): { used: number; limit: number } | null {
  const f = state.features['simulations_per_month'];
  if (typeof f === 'object' && f !== null && 'limit' in f) {
    return { used: f.used, limit: f.limit };
  }
  return null;
}

/** Days until trial expiry, or null if not trialing. */
export function trialDaysRemaining(state: EntitlementsState): number | null {
  if (state.planStatus !== 'trialing' || !state.trialExpiresAt) return null;
  const expiresMs = Date.parse(state.trialExpiresAt);
  if (Number.isNaN(expiresMs)) return null;
  const diffMs = expiresMs - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/** Human-friendly plan label for badges: @quodsi/shared's formatPlanName,
 *  the names Studio and drawio show. No plan yet reads as the free plan. */
export function planDisplayLabel(state: EntitlementsState): string {
  return formatPlanName(state.loaded && state.planKey ? state.planKey : PLAN_FREE);
}
