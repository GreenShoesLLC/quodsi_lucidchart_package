import { useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('useSendMessage');

/**
 * Hook for sending messages to the host application
 */
export function useSendMessage(
  state: { app: { panelType?: 'auth' | 'model' } },
  dispatch: React.Dispatch<any>
) {
  return useCallback(
    <T extends EnvelopeMessageType>(type: T, data?: any) => {
      // Create message envelope
      const envelope: EnvelopeBase = {
        id: uuid(),
        type,
        source: state.app.panelType === "auth" ? "auth-iframe" : "model-iframe",
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
      if (window.parent) {
        logger.log(`Sending message: ${type}`, envelope);
        window.parent.postMessage(envelope, "*");
      } else {
        logger.error("No parent window found to send message to");
      }
    },
    [state.app.panelType, dispatch]
  );
}
