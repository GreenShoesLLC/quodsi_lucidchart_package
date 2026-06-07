import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/lucid-shared';
import { router } from '../index';
import { ModelManager } from '../../ModelManager';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';

interface PortalUrlRequestData {
  subNav?: string;
  returnUrl?: string;
}

interface PortalUrlResponsePayload {
  url?: string;
  error?: string;
}

/**
 * Handler for Kinde portal URL requests.
 *
 * The panel cannot mint a Kinde portal URL itself: it has only postMessage-
 * bridged auth state, no live Kinde access token. The extension's data
 * connector call ({@link client.performDataAction}) does have the user's
 * Kinde token via Lucid's platform OAuth, so we proxy the request through
 * the Quodsi data connector's `GeneratePortalUrl` action.
 *
 * One-shot RPC: panel sends PORTAL_URL_REQUEST with a correlation `id`,
 * we send PORTAL_URL_RESPONSE back with the same `id` so the panel's
 * `usePortalSender` hook can match request to response.
 */
export class PortalHandler {
  private static logger = ExtensionDebugService.forComponent('PortalHandler');

  public static handleMessage(msg: EnvelopeBase): boolean {
    if (msg.type === EnvelopeMessageType.PORTAL_URL_REQUEST) {
      PortalHandler.handlePortalUrlRequest(msg);
      return true;
    }
    return false;
  }

  private static async handlePortalUrlRequest(msg: EnvelopeBase): Promise<void> {
    const data = (msg.data || {}) as PortalUrlRequestData;
    const subNav = data.subNav;
    const returnUrl = data.returnUrl;

    if (!subNav || !returnUrl) {
      PortalHandler.sendResponse(msg.id, {
        error: 'subNav and returnUrl are required',
      });
      return;
    }

    try {
      const client = ModelManager.getClient();
      const result = (await client.performDataAction({
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'GeneratePortalUrl',
        actionData: { subNav, returnUrl },
        asynchronous: false,
      })) as { status?: number; json?: { url?: string } };

      if (!result?.json?.url) {
        PortalHandler.logger.log(
          'GeneratePortalUrl returned no url; status:',
          result?.status,
        );
        PortalHandler.sendResponse(msg.id, {
          error: `Portal URL request failed (status ${result?.status ?? 'unknown'})`,
        });
        return;
      }

      PortalHandler.sendResponse(msg.id, { url: result.json.url });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      PortalHandler.logger.error('Portal URL request error:', error);
      PortalHandler.sendResponse(msg.id, { error: message });
    }
  }

  private static sendResponse(
    correlationId: string,
    payload: PortalUrlResponsePayload,
  ): void {
    router.send('model', {
      id: correlationId,
      type: EnvelopeMessageType.PORTAL_URL_RESPONSE,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: payload,
    });
  }
}
