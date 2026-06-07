import { useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { EnvelopeBase, EnvelopeMessageType, MessageSource } from '@quodsi/lucid-shared';
import { useMessaging } from '../MessageProvider';

// Generous to cover Lucid's data-connector relay round-trip plus the
// API's call to Kinde's portal_link endpoint. Real-world successful
// responses observed taking >15s in local dev.
const PORTAL_URL_TIMEOUT_MS = 60_000;

const SOURCE_BY_PANEL: Record<string, MessageSource> = {
  auth: 'auth-iframe',
  model: 'model-iframe',
  results: 'results-iframe',
};

/**
 * One-shot RPC sender for panel-initiated portal URL requests.
 *
 * Unlike the broadcast-via-Redux pattern used for entitlements, this
 * mints its own correlation ID and resolves a Promise when the matching
 * PORTAL_URL_RESPONSE arrives. Lets the caller `await
 * requestPortalUrl(...)` and immediately `window.open(url)` afterward.
 */
export function usePortalSender() {
  const { app } = useMessaging();
  const source = SOURCE_BY_PANEL[app.panelType || 'model'] ?? 'model-iframe';

  const requestPortalUrl = useCallback(
    (subNav: string, returnUrl: string): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        if (!window.parent) {
          reject(new Error('No parent window to send portal request to'));
          return;
        }

        const correlationId = uuid();
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const handler = (event: MessageEvent) => {
          const msg = event.data;
          if (
            msg?.id === correlationId &&
            msg?.type === EnvelopeMessageType.PORTAL_URL_RESPONSE
          ) {
            window.removeEventListener('message', handler);
            if (timeoutId !== undefined) clearTimeout(timeoutId);
            const data = (msg.data || {}) as { url?: string; error?: string };
            if (data.error) {
              reject(new Error(data.error));
            } else if (data.url) {
              resolve(data.url);
            } else {
              reject(new Error('Portal URL response missing both url and error'));
            }
          }
        };

        window.addEventListener('message', handler);
        timeoutId = setTimeout(() => {
          window.removeEventListener('message', handler);
          reject(new Error('Portal URL request timed out'));
        }, PORTAL_URL_TIMEOUT_MS);

        const envelope: EnvelopeBase = {
          id: correlationId,
          type: EnvelopeMessageType.PORTAL_URL_REQUEST,
          source,
          target: 'host',
          version: '1.0',
          data: { subNav, returnUrl },
        };
        window.parent.postMessage(envelope, '*');
      });
    },
    [source],
  );

  return { requestPortalUrl };
}
