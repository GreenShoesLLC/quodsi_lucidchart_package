import { useEffect } from 'react';
import { EnvelopeMessageType } from '@quodsi/shared';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('ReactAppReadyEffects');

/**
 * Effect for REACT_APP_READY sending
 *
 * Purpose:
 * - Sends the REACT_APP_READY message to the extension host when conditions are met
 * - This message indicates the React application is initialized and ready to receive messages
 * - Sets flags to prevent sending the message multiple times
 *
 * Trigger Conditions (all must be true):
 * - hasSentReadyRef.current is false (haven't sent the message yet)
 * - state.app.initialized is true (app is initialized)
 * - state.app.panelType is defined (panel type is determined)
 *
 * Key Actions:
 * - Sends REACT_APP_READY message with panel type
 * - Sets hasSentReadyRef.current to true to prevent sending multiple times
 */
export function useReactAppReadyEffect(
  state: {
    app: { initialized: boolean; panelType?: 'auth' | 'model' };
  },
  sendMessage: (type: EnvelopeMessageType, data?: any) => void,
  hasSentReadyRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    // Check if all conditions are met to send REACT_APP_READY
    if (
      !hasSentReadyRef.current && // Haven't sent it yet
      state.app.initialized && // App is initialized
      state.app.panelType // Panel type is determined
    ) {
      logger.log("All conditions met for sending REACT_APP_READY:", {
        appInitialized: state.app.initialized,
        panelType: state.app.panelType
      });

      sendMessage(EnvelopeMessageType.REACT_APP_READY, {
        panel: state.app.panelType
      });

      // Mark as sent so we don't send it again
      hasSentReadyRef.current = true;

      logger.log("Successfully sent REACT_APP_READY message");
    }
  }, [
    state.app.initialized,
    state.app.panelType,
    sendMessage,
    hasSentReadyRef
  ]);
}
