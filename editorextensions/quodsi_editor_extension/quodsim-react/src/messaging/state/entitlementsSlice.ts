import {
  EntitlementMeteredFeature,
  EntitlementPlanStatus,
  EntitlementSubjectType,
} from '@quodsi/lucid-shared';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('EntitlementsSlice');

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
}

export const initialEntitlementsState: EntitlementsState = {
  loaded: false,
  subjectType: null,
  planKey: null,
  planStatus: null,
  trialExpiresAt: null,
  features: {},
  upgradeAvailable: null,
};

export type EntitlementsAction =
  | {
      type: 'ENTITLEMENTS_STATUS_UPDATE';
      subjectType: EntitlementSubjectType;
      planKey: string;
      planStatus: EntitlementPlanStatus;
      trialExpiresAt?: string;
      features: Record<string, EntitlementMeteredFeature | boolean>;
      upgradeAvailable?: boolean;
    }
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
 * Per-model RUN cap. Returns true if the user can run *a new scenario
 * for the first time* given that `distinctRunsCount` distinct scenarios
 * have already been run for this model. Re-running an already-run
 * scenario is always allowed (doesn't consume a slot) -- callers
 * typically only invoke this helper for not-yet-run scenarios.
 *
 * Free=1 distinct scenario per model, Starter=3, Pro=10,
 * Enterprise=2,147,483,647 (sentinel). If the feature is missing or
 * pre-load (entitlements haven't arrived), allows the action — UI must
 * not block users on transient state.
 *
 * Backend is the authoritative gate (returns 402 from
 * SaveAndSubmitSimulation / SubmitSimulationJob when a new run would
 * push the model over its cap); this helper just lets the panel grey
 * out per-scenario Run buttons proactively.
 */
export function canRunNewScenario(
  state: EntitlementsState,
  distinctRunsCount: number
): boolean {
  if (!state.loaded) return true;
  const f = state.features['scenarios_per_model'];
  if (typeof f === 'object' && f !== null && 'limit' in f) {
    return distinctRunsCount < f.limit;
  }
  // Feature absent — defensive default of "allow" so we don't lock users out
  // due to a missing entitlement payload.
  return true;
}

/** Per-model scenario cap value, or null when unlimited / unknown. */
export function scenariosPerModelLimit(state: EntitlementsState): number | null {
  if (!state.loaded) return null;
  const f = state.features['scenarios_per_model'];
  if (typeof f === 'object' && f !== null && 'limit' in f) {
    return f.limit;
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

/** Human-friendly plan label for badges. */
export function planDisplayLabel(state: EntitlementsState): string {
  if (!state.loaded || !state.planKey) return 'Free plan';
  switch (state.planKey) {
    case 'quodsi_free_user':
      return 'Free plan';
    case 'quodsi_pro_user':
      return 'Pro plan';
    case 'quodsi_pro_team':
      return 'Team plan';
    case 'quodsi_enterprise_team':
      return 'Enterprise';
    default:
      return state.planKey;
  }
}
