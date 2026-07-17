import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/lucid-shared';
import { router } from '../index';
import { ModelManager } from '../../ModelManager';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';

interface UpgradeInterestPingData {
  feature?: string;
}

interface UpgradeInterestPingResultPayload {
  ok: boolean;
  error?: string;
}

/**
 * Handler for the PlanBadge dropdown's "contact sales" upgrade-interest ping.
 *
 * Proxies through the Quodsi data connector's `UpgradeInterest` action (see
 * `app/routers/lucid_router.py::upgrade_interest` in quodsi_api), mirroring
 * PortalHandler's `client.performDataAction({ dataConnectorName:
 * 'quodsi_api_data_connector', actionName: ... })` pattern — the extension
 * has the user's Kinde token via Lucid's platform OAuth; the panel does not.
 */
export class UpgradeInterestHandler {
  private static logger = ExtensionDebugService.forComponent('UpgradeInterestHandler');

  public static handleMessage(msg: EnvelopeBase): boolean {
    if (msg.type === EnvelopeMessageType.UPGRADE_INTEREST_PING) {
      UpgradeInterestHandler.handlePing(msg);
      return true;
    }
    return false;
  }

  private static async handlePing(msg: EnvelopeBase): Promise<void> {
    const data = (msg.data || {}) as UpgradeInterestPingData;
    const feature = data.feature;

    if (!feature) {
      UpgradeInterestHandler.sendResult(msg.id, {
        ok: false,
        error: 'feature is required',
      });
      return;
    }

    try {
      const client = ModelManager.getClient();
      const result = (await client.performDataAction({
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'UpgradeInterest',
        actionData: { feature },
        asynchronous: false,
      })) as { status?: number; json?: { success?: boolean } };

      if (!result?.json?.success) {
        UpgradeInterestHandler.logger.log(
          'UpgradeInterest returned no success; status:',
          result?.status,
        );
        UpgradeInterestHandler.sendResult(msg.id, {
          ok: false,
          error: `Upgrade interest request failed (status ${result?.status ?? 'unknown'})`,
        });
        return;
      }

      UpgradeInterestHandler.sendResult(msg.id, { ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      UpgradeInterestHandler.logger.error('Upgrade interest request error:', error);
      UpgradeInterestHandler.sendResult(msg.id, { ok: false, error: message });
    }
  }

  private static sendResult(
    correlationId: string,
    payload: UpgradeInterestPingResultPayload,
  ): void {
    router.send('model', {
      id: correlationId,
      type: EnvelopeMessageType.UPGRADE_INTEREST_PING_RESULT,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: payload,
    });
  }
}
