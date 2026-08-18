import { EnvelopeBase, EnvelopeMessageType, getLogger } from '@quodsi/lucid-shared';
import { MessagingAction } from '../state/types';

// Create a component-specific logger
const logger = getLogger('ElementOpsMapper');

/**
 * Map element operations messages to Redux actions
 * 
 * @param msg The envelope message to map
 * @returns A Redux action or null if this mapper doesn't handle the message type
 */
export function mapElementOps(msg: EnvelopeBase): MessagingAction | null {
  // Only handle element operations messages
  switch (msg.type) {
    case EnvelopeMessageType.ELEMENT_UPDATE_RESULT:
      return handleElementUpdateResult(msg);
      
    case EnvelopeMessageType.ELEMENT_CONVERT_RESULT:
      return handleElementConvertResult(msg);
      
    default:
      return null;
  }
}

/**
 * Handle element update result messages
 */
function handleElementUpdateResult(msg: EnvelopeBase): MessagingAction | null {
  const data = msg.data as {
    success: boolean;
    elementId: string;
    errorMessage?: string;
  };

  logger.debug('Handling ELEMENT_UPDATE_RESULT:', data);

  // Dispatch Redux action based on save success/failure
  if (data.success) {
    logger.debug(`Element ${data.elementId} saved successfully`);
    return {
      type: 'ELEMENT_SAVE_SUCCESS',
      elementId: data.elementId,
    };
  } else {
    logger.error(`Element ${data.elementId} save failed:`, data.errorMessage);
    return {
      type: 'ELEMENT_SAVE_ERROR',
      elementId: data.elementId,
      errorMessage: data.errorMessage || 'Unknown error occurred during save',
    };
  }
}

/**
 * Handle element conversion result messages
 */
function handleElementConvertResult(msg: EnvelopeBase): MessagingAction | null {
  const data = msg.data as {
    success: boolean;
    elementId: string;
    errorMessage?: string;
  };
  
  logger.debug('Handling ELEMENT_CONVERT_RESULT:', data);
  
  // Currently there is no toast notification system in the app
  // Just return null to indicate message was handled but no state change needed
  return null;
}
