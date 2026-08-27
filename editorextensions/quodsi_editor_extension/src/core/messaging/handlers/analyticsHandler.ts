import { EditorClient } from 'lucid-extension-sdk';
import { ClientAnalyticsEvent, getLogger } from '@quodsi/lucid-shared';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
import { AuthHandler } from './authHandler';

const log = getLogger('AnalyticsHandler');

/**
 * Fires product-telemetry events from the extension host to the backend
 * TrackEvent data action. Extension code calls AnalyticsHandler.fire(event, props)
 * directly (e.g. model_opened, first_model_created).
 */
export class AnalyticsHandler {
  private static client: EditorClient | null = null;
  private static lastModelOpenedId: string | null = null;

  public static initialize(client: EditorClient): void {
    AnalyticsHandler.client = client;
  }

  /** Fire `model_opened` only when the modelId differs from the last open in this session. */
  public static fireModelOpenedIfNew(modelId: string): void {
    if (!modelId || AnalyticsHandler.lastModelOpenedId === modelId) return;
    AnalyticsHandler.lastModelOpenedId = modelId;
    AnalyticsHandler.fire('model_opened', { model_id: modelId });
  }

  /** Fire-and-forget. Never throws. */
  public static fire(event: ClientAnalyticsEvent, properties?: Record<string, unknown>): void {
    const client = AnalyticsHandler.client;
    if (!client) {
      log.warn('not initialized; dropping', event);
      return;
    }
    // model_opened fires from panel init, before Kinde auth. A data action
    // before auth runs the lucid-provider OAuth workaround while Lucid's
    // dialog stack is needed for sign-in — for a local package that flow
    // fails and Lucid then suppresses the Kinde prompt (2026-08-27). Hold the
    // event until auth-ready; the listener fires immediately if already
    // authenticated, so the warm path is unchanged.
    if (!AuthHandler.getIsAuthenticated()) {
      let sent = false;
      AuthHandler.registerAuthReadyListener(() => {
        if (sent) return;
        sent = true;
        AnalyticsHandler.send(client, event, properties);
      });
      return;
    }
    AnalyticsHandler.send(client, event, properties);
  }

  private static send(client: EditorClient, event: ClientAnalyticsEvent, properties?: Record<string, unknown>): void {
    LucidDataActionUtility.performDataAction(client, {
      dataConnectorName: 'quodsi_api_data_connector',
      actionName: 'TrackEvent',
      actionData: { event, properties: properties || {} },
      asynchronous: false,
    }).catch((err) => {
      log.warn('TrackEvent failed', event, err);
    });
  }
}
