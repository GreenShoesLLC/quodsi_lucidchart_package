import { EditorClient } from 'lucid-extension-sdk';
import { ClientAnalyticsEvent } from '@quodsi/lucid-shared';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';

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
