import { useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { EnvelopeBase, EnvelopeMessageType, MessageSource } from '@quodsi/lucid-shared';
import { useMessaging } from '../MessageProvider';

// Short timeout: this ping round-trips through the extension host to the
// Quodsi data connector's `UpgradeInterest` action (see
// upgradeInterestHandler.ts) and back. Callers should treat this as
// fire-and-forget regardless (see below).
const UPGRADE_INTEREST_PING_TIMEOUT_MS = 15_000;

const SOURCE_BY_PANEL: Record<string, MessageSource> = {
  auth: 'auth-iframe',
  model: 'model-iframe',
  results: 'results-iframe',
};

/**
 * One-shot RPC sender for PlanDetails's "contact sales" upgrade-interest
 * ping (behind AuthStatusIndicator's "Plan details" disclosure). Mirrors
 * usePortalSender's request/response correlation
 * pattern exactly (own correlation ID, resolves/rejects a Promise on the
 * matching UPGRADE_INTEREST_PING_RESULT).
 *
 * Callers should treat `pingUpgradeInterest` as fire-and-forget — it's a
 * courtesy signal for sales follow-up, not a blocking step in the contact
 * flow (the mailto link / copy-to-clipboard button already give the user
 * their outcome). Never await this in a way that blocks or surfaces an
 * error to the user.
 */
export function useUpgradeInterestSender() {
  const { app } = useMessaging();
  const source = SOURCE_BY_PANEL[app.panelType || 'model'] ?? 'model-iframe';

  const pingUpgradeInterest = useCallback(
    (feature: string): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        if (!window.parent) {
          reject(new Error('No parent window to send upgrade-interest ping to'));
          return;
        }

        const correlationId = uuid();
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const handler = (event: MessageEvent) => {
          const msg = event.data;
          if (
            msg?.id === correlationId &&
            msg?.type === EnvelopeMessageType.UPGRADE_INTEREST_PING_RESULT
          ) {
            window.removeEventListener('message', handler);
            if (timeoutId !== undefined) clearTimeout(timeoutId);
            const data = (msg.data || {}) as { ok?: boolean; error?: string };
            if (data.ok) {
              resolve();
            } else {
              reject(new Error(data.error || 'Upgrade interest ping failed'));
            }
          }
        };

        window.addEventListener('message', handler);
        timeoutId = setTimeout(() => {
          window.removeEventListener('message', handler);
          reject(new Error('Upgrade interest ping timed out'));
        }, UPGRADE_INTEREST_PING_TIMEOUT_MS);

        const envelope: EnvelopeBase = {
          id: correlationId,
          type: EnvelopeMessageType.UPGRADE_INTEREST_PING,
          source,
          target: 'host',
          version: '1.0',
          data: { feature },
        };
        window.parent.postMessage(envelope, '*');
      });
    },
    [source],
  );

  return { pingUpgradeInterest };
}
