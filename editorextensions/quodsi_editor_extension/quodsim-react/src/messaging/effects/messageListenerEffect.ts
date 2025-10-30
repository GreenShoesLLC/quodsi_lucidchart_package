import { useEffect } from 'react';
import { EnvelopeMessageType } from '@quodsi/shared';
import { createRxMessageHandler } from '../handlers';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('MessageListenerEffect');

/**
 * Effect for setting up message listener
 */
export function useMessageListenerEffect(
  state: any,
  dispatch: React.Dispatch<any>,
  sendMessage: (type: EnvelopeMessageType, data?: any) => void,
  processedMessageIds: React.MutableRefObject<Set<string>>
) {
  useEffect(() => {
    // Log selection state on each effect run to help diagnose selection issues
    logger.debug('Current selection state:', {
      hasSelectedElements: state.selection.selectedElements?.length > 0,
      selectedElementCount: state.selection.selectedElements?.length || 0,
      firstElementId: state.selection.selectedElements?.[0]?.id,
      hasDocumentContext: !!state.selection.documentContext,
      isQuodsiModel: state.selection.documentContext?.isQuodsiModel,
      lastUpdated: state.selection.lastUpdated
    });

    const handleMessage = createRxMessageHandler(state, dispatch, processedMessageIds, sendMessage);

    // Add message event listener
    window.addEventListener("message", handleMessage);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [
    state,
    dispatch,
    sendMessage,
    processedMessageIds
  ]);
}
