import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { debugService } from '../utils/debugService';
import { MessagingAction } from '../state/types';

// Create a component-specific logger
const logger = debugService.forComponent('ElementOpsMapper');

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
  
  logger.log('Handling ELEMENT_UPDATE_RESULT:', data);
  
  // Currently there is no toast notification system in the app
  // Just return null to indicate message was handled but no state change needed
  return null;
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
  
  logger.log('Handling ELEMENT_CONVERT_RESULT:', data);
  
  // Currently there is no toast notification system in the app
  // Just return null to indicate message was handled but no state change needed
  return null;
}
