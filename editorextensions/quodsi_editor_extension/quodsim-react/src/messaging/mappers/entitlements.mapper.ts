import {
  EnvelopeBase,
  EnvelopeMessageType,
  EntitlementsStatusData,
} from '@quodsi/lucid-shared';
import { MessagingAction } from '../state/types';
import { getLogger } from '@quodsi/lucid-shared';

const logger = getLogger('EntitlementsMapper');

/**
 * Maps ENTITLEMENTS_STATUS envelope messages into Redux actions.
 * Hosts send this after login completes and whenever the cache is refreshed.
 */
export function mapEntitlements(msg: EnvelopeBase): MessagingAction | null {
  if (msg.type !== EnvelopeMessageType.ENTITLEMENTS_STATUS) return null;

  const data = msg.data as EntitlementsStatusData;

  logger.debug('ENTITLEMENTS_STATUS received:', {
    ...data,
    featureKeys: data.features ? Object.keys(data.features) : [],
  });

  return { type: 'ENTITLEMENTS_STATUS_UPDATE', ...data };
}
