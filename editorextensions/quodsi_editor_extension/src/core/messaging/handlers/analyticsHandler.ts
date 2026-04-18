import { EditorClient } from 'lucid-extension-sdk';
import { EnvelopeBase, EnvelopeMessageType, ClientAnalyticsEvent } from '@quodsi/shared';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';

/**
 * Handles analytics events originating from inside the extension + React.
 *
 * React sends ANALYTICS_TRACK postMessages -> handleMessage() picks them up
 * and forwards via performDataAction("TrackEvent"). Extension code can call
 * AnalyticsHandler.fire(event, props) directly without routing through React.
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

  public static handleMessage(msg: EnvelopeBase): boolean {
    if (msg.type !== EnvelopeMessageType.ANALYTICS_TRACK) {
      return false;
    }
    const data = msg.data as { event: ClientAnalyticsEvent; properties?: Record<string, unknown> };
    AnalyticsHandler.fire(data.event, data.properties);
    return true;
  }

  /** Fire-and-forget. Never throws. */
  public static fire(event: ClientAnalyticsEvent, properties?: Record<string, unknown>): void {
    const client = AnalyticsHandler.client;
    if (!client) {
      console.warn('[AnalyticsHandler] not initialized; dropping', event);
      return;
    }
    LucidDataActionUtility.performDataAction(client, {
      dataConnectorName: 'quodsi_api_data_connector',
      actionName: 'TrackEvent',
      actionData: { event, properties: properties || {} },
      asynchronous: false,
    }).catch((err) => {
      console.warn('[AnalyticsHandler] TrackEvent failed', event, err);
    });
  }
}
