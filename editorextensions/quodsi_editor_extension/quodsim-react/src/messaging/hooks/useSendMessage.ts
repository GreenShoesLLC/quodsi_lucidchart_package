import { useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { EnvelopeBase, EnvelopeMessageType, MessageSource, getLogger } from '@quodsi/lucid-shared';
import { flushAllModelRootWrites, hasPendingModelRootWrites } from '../../adapters/modelRootWrites';

const logger = getLogger('useSendMessage');

/**
 * Messages whose host handler reads the stored model. While a model-root
 * batch is pending or in flight they wait for it, so the host sees the latest
 * edit (spec 2026-09-12 lucid-model-root-batching §3). Every other message
 * posts at once. Because the wait is asynchronous, a listed message issued
 * now can still reach the host AFTER an unlisted message sent later in the
 * same tick -- callers that need strict ordering between the two cannot rely
 * on call order alone.
 */
export const FLUSH_BEFORE_SEND: ReadonlySet<EnvelopeMessageType> = new Set([
  EnvelopeMessageType.MODEL_RUN_REQUEST,
  EnvelopeMessageType.MODEL_VALIDATE,
  EnvelopeMessageType.MODEL_JSON_REQUEST,
  EnvelopeMessageType.RUN_SCENARIO,
  EnvelopeMessageType.OPEN_STUDIES_MODAL,
  EnvelopeMessageType.OPEN_ADVISOR_MODAL,
  EnvelopeMessageType.OPEN_DIAGRAM_MAPPING_MODAL,
  EnvelopeMessageType.OPEN_PATTERN_MODAL,
  EnvelopeMessageType.OPEN_SCHEDULE_MODAL,
  EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL,
]);

/**
 * Hook for sending messages to the host application
 */
export function useSendMessage(
  state: { app: { panelType?: 'auth' | 'model' | 'results' | 'studio-embed' | 'pattern' | 'schedule' | 'work-schedule' | 'settings' } },
  dispatch: React.Dispatch<any>
) {
  return useCallback(
    <T extends EnvelopeMessageType>(type: T, data?: any) => {
      // Create message envelope
      const sourceMap: Record<string, MessageSource> = {
        auth: 'auth-iframe',
        model: 'model-iframe',
        results: 'results-iframe',
        'studio-embed': 'studio-embed-iframe',
        pattern: 'pattern-iframe',
        schedule: 'schedule-iframe',
        'work-schedule': 'work-schedule-iframe',
        settings: 'settings-iframe',
      };
      const envelope: EnvelopeBase = {
        id: uuid(),
        type,
        source: sourceMap[state.app.panelType || 'model'] ?? 'model-iframe',
        target: "host",
        version: "1.0",
        data: data || {},
      };

      // Record outgoing requests in state when needed
      if (
        type !== EnvelopeMessageType.REACT_APP_READY &&
        type !== EnvelopeMessageType.LOG
      ) {
        dispatch({
          type: "ADD_PENDING_REQUEST",
          id: envelope.id,
          requestType: type,
        });
      }

      // Send message to parent window
      const post = () => {
        if (window.parent) {
          logger.debug(`Sending message: ${type}`, envelope);
          window.parent.postMessage(envelope, "*");
        } else {
          logger.error("No parent window found to send message to");
        }
      };

      if (FLUSH_BEFORE_SEND.has(type) && hasPendingModelRootWrites()) {
        void flushAllModelRootWrites().then(post);
      } else {
        post();
      }
    },
    [state.app.panelType, dispatch]
  );
}
