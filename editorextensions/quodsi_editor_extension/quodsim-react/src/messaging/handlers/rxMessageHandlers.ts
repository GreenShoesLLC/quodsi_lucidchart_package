import { EnvelopeMessageType, isEnvelope } from '@quodsi/shared';
import { debugService } from '../utils/debugService';
import { mapEnvelopeToAction } from '../mappers/mapEnvelopeToAction';

const logger = debugService.forComponent('RxMessageHandlers');

/**
 * Creates a message handler function for processing messages from the host
 */
export function createRxMessageHandler(
  state: any,
  dispatch: React.Dispatch<any>,
  processedMessageIds: React.MutableRefObject<Set<string>>,
  sendMessage: (type: EnvelopeMessageType, data?: any) => void
) {
  return function handleMessage(event: MessageEvent) {
    logger.debug("Received raw event:", event);
    const msg = event.data;
    logger.debug("Received message data:", msg);

    // Skip processing if not a valid envelope
    if (!isEnvelope(msg)) {
      logger.warn("Received invalid message format:", msg);
      return;
    }

    // For all message types, check for duplicates
    // Deduplicate messages - skip if we've already processed this message ID
    if (msg.id && processedMessageIds.current.has(msg.id)) {
      logger.debug(`Skipping duplicate message with ID: ${msg.id}`);
      return;
    }

    // Add message ID to processed set
    if (msg.id) {
      processedMessageIds.current.add(msg.id);

      // Limit size of the processed IDs set to avoid memory issues
      if (processedMessageIds.current.size > 100) {
        // Convert to array, keep only the most recent 50 IDs
        const ids = Array.from(processedMessageIds.current);
        processedMessageIds.current = new Set(ids.slice(ids.length - 50));
      }
    }

    logger.log(`Received message: ${msg.type}`, msg);

    // If this is a response to a request, clean up the pending request
    if (msg.id && state.app.pendingRequests[msg.id]) {
      logger.log(`Received response for request: ${msg.id}`);
      dispatch({
        type: "REMOVE_PENDING_REQUEST",
        id: msg.id,
      });
    }

    // Convert envelope to action using mappers
    const actionResult = mapEnvelopeToAction(msg);

    // Handle multiple actions if returned as an array
    if (Array.isArray(actionResult)) {
      logger.log("Dispatching multiple actions:", actionResult);
      actionResult.forEach(action => {
        if (action) {
          dispatch(action);
        }
      });
    }
    // Update state if a single action was produced
    else if (actionResult) {
      logger.log("Dispatching action:", actionResult);
      dispatch(actionResult);
    }
  };
}
