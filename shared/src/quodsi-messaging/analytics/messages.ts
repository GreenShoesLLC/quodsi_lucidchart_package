import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';

/** Event names fired from clients (React / extension). Must match the API allowlist. */
export type ClientAnalyticsEvent =
  | 'model_opened'
  | 'first_model_created'
  | 'results_viewed'
  | 'first_results_viewed';

/** React → extension: please forward this event to the backend TrackEvent action. */
export interface AnalyticsTrackMessage extends EnvelopeBase {
  type: EnvelopeMessageType.ANALYTICS_TRACK;
  data: {
    event: ClientAnalyticsEvent;
    properties?: Record<string, unknown>;
  };
}

export type AnalyticsMessage = AnalyticsTrackMessage;
