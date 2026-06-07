import {
  EnvelopeBase,
  EnvelopeMessageType,
  EntitlementMeteredFeature,
  EntitlementPlanStatus,
  EntitlementSubjectType,
} from '@quodsi/lucid-shared';
import { MessagingAction } from '../state/types';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('EntitlementsMapper');

/**
 * Maps ENTITLEMENTS_STATUS envelope messages into Redux actions.
 * Hosts send this after AUTH_LOGIN_SUCCESS and whenever the cache is refreshed.
 */
export function mapEntitlements(msg: EnvelopeBase): MessagingAction | null {
  if (msg.type !== EnvelopeMessageType.ENTITLEMENTS_STATUS) return null;

  const data = msg.data as {
    subjectType: EntitlementSubjectType;
    planKey: string;
    planStatus: EntitlementPlanStatus;
    trialExpiresAt?: string;
    features: Record<string, EntitlementMeteredFeature | boolean>;
    upgradeAvailable?: boolean;
  };

  logger.log('ENTITLEMENTS_STATUS received:', {
    subjectType: data.subjectType,
    planKey: data.planKey,
    planStatus: data.planStatus,
    trialExpiresAt: data.trialExpiresAt,
    features: data.features,
    featureKeys: data.features ? Object.keys(data.features) : [],
  });

  return {
    type: 'ENTITLEMENTS_STATUS_UPDATE',
    subjectType: data.subjectType,
    planKey: data.planKey,
    planStatus: data.planStatus,
    trialExpiresAt: data.trialExpiresAt,
    features: data.features,
    upgradeAvailable: data.upgradeAvailable,
  };
}
