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

/** Does the plan allow the 2nd+ scenario? */
export function canUseScenarioStudies(state: EntitlementsState): boolean {
  if (!state.loaded) return true;
  return state.features['scenario_studies'] === true;
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
