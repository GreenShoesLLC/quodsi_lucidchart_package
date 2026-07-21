import {
  EnvelopeBase,
  EnvelopeMessageType,
  EntitlementMeteredFeature,
  EntitlementPlanSource,
  EntitlementPlanStatus,
  EntitlementSubjectType,
} from '@quodsi/lucid-shared';
import { MessagingAction } from '../state/types';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('EntitlementsMapper');

/**
 * Maps ENTITLEMENTS_STATUS envelope messages into Redux actions.
 * Hosts send this after login completes and whenever the cache is refreshed.
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
    planSource?: EntitlementPlanSource;
    orgName?: string | null;
    studiesUsed?: number;
    studiesPerOrgLimit?: number | null;
    scenariosPerStudyLimit?: number | null;
    replicationsPerScenarioLimit?: number | null;
    tradeoffAnalysis?: boolean;
    chartExport?: boolean;
  };

  logger.log('ENTITLEMENTS_STATUS received:', {
    subjectType: data.subjectType,
    planKey: data.planKey,
    planStatus: data.planStatus,
    trialExpiresAt: data.trialExpiresAt,
    features: data.features,
    featureKeys: data.features ? Object.keys(data.features) : [],
    planSource: data.planSource,
    orgName: data.orgName,
  });

  return {
    type: 'ENTITLEMENTS_STATUS_UPDATE',
    subjectType: data.subjectType,
    planKey: data.planKey,
    planStatus: data.planStatus,
    trialExpiresAt: data.trialExpiresAt,
    features: data.features,
    upgradeAvailable: data.upgradeAvailable,
    planSource: data.planSource,
    orgName: data.orgName,
    studiesUsed: data.studiesUsed,
    studiesPerOrgLimit: data.studiesPerOrgLimit,
    scenariosPerStudyLimit: data.scenariosPerStudyLimit,
    replicationsPerScenarioLimit: data.replicationsPerScenarioLimit,
    tradeoffAnalysis: data.tradeoffAnalysis,
    chartExport: data.chartExport,
  };
}
