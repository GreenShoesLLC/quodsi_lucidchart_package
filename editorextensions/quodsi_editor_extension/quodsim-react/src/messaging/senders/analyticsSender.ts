import { useCallback, useMemo } from 'react';
import { EnvelopeMessageType, ClientAnalyticsEvent } from '@quodsi/shared';
import { useSender } from './useSender';

/**
 * React-side analytics sender. Fire-and-forget — never surfaces errors.
 */
export function useAnalyticsSender() {
  const send = useSender();

  const track = useCallback(
    (event: ClientAnalyticsEvent, properties?: Record<string, unknown>) => {
      try {
        send(EnvelopeMessageType.ANALYTICS_TRACK, { event, properties });
      } catch (err) {
        console.warn('[analytics] track failed', event, err);
      }
    },
    [send],
  );

  return useMemo(() => ({ track }), [track]);
}
