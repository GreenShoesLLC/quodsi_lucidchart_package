import {
  EntitlementMeteredFeature,
  EntitlementPlanStatus,
  EntitlementSubjectType,
} from '@quodsi/shared';
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
}

export const initialEntitlementsState: EntitlementsState = {
  loaded: false,
  subjectType: null,
  planKey: null,
  planStatus: null,
  trialExpiresAt: null,
  features: {},
};

export type EntitlementsAction =
  | {
      type: 'ENTITLEMENTS_STATUS_UPDATE';
      subjectType: EntitlementSubjectType;
      planKey: string;
      planStatus: EntitlementPlanStatus;
      trialExpiresAt?: string;
      features: Record<string, EntitlementMeteredFeature | boolean>;
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
 * Per-model scenario cap. Returns true if the user can add another scenario
 * to a model that currently has `currentScenarioCount` scenarios. The plan's
 * `scenarios_per_model.limit` is the maximum (baseline counts toward it).
 *
 * Free=1 (baseline only), Starter=3, Pro=10, Enterprise=2,147,483,647 (sentinel).
 * If the feature is missing or pre-load (entitlements haven't arrived), allows
 * the action — UI must not block users on transient state.
 */
export function canAddScenarioToModel(
  state: EntitlementsState,
  currentScenarioCount: number
): boolean {
  if (!state.loaded) return true;
  const f = state.features['scenarios_per_model'];
  if (typeof f === 'object' && f !== null && 'limit' in f) {
    return currentScenarioCount < f.limit;
  }
  // Feature absent — defensive default of "allow" so we don't lock users out
  // due to a missing entitlement payload. Backend remains the authoritative
  // gate (returns 402 if over the cap).
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
