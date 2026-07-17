import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/lucid-shared';
import { router } from '../index';
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
 * TODO(task-8-backend-seam): quodsi_api already exposes a direct REST route,
 * `POST /me/upgrade-interest` (app/routers/users_router.py), but the Lucid
 * data connector can only reach the routes registered under quodsi_api's
 * `/lucid/*` router (see `GetMyEntitlements` / `GeneratePortalUrl` in
 * app/routers/lucid_router.py, and PortalHandler in this codebase for the
 * proxy pattern via `client.performDataAction({ dataConnectorName:
 * 'quodsi_api_data_connector', actionName: ... })`). There is no
 * data-connector action wired to `/me/upgrade-interest` yet, and adding one
 * (plus registering it in the data connector's action manifest) is out of
 * scope for this task. Until that seam exists, this handler cannot actually
 * reach the backend — it logs the ping for visibility and acks with
 * `ok: false` so the panel's fire-and-forget caller resolves/rejects
 * promptly instead of hanging until the RPC timeout.
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

  private static handlePing(msg: EnvelopeBase): void {
    const data = (msg.data || {}) as UpgradeInterestPingData;

    UpgradeInterestHandler.logger.log(
      'upgrade_interest_ping received — backend seam not wired yet, see TODO(task-8-backend-seam) in this file',
      { feature: data.feature },
    );

    UpgradeInterestHandler.sendResult(msg.id, {
      ok: false,
      error: 'upgrade_interest_ping_not_wired: no data-connector action reaches /me/upgrade-interest yet (task-8 backend seam, pending)',
    });
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
