import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { MessagingDispatch } from '../MessageContext';

/**
 * Handler for element operations messages received from the extension
 */
export function handleElementOpsMessage(
  message: EnvelopeBase,
  _state: any,
  dispatch: MessagingDispatch
): boolean {
  
  switch (message.type) {
    case EnvelopeMessageType.ELEMENT_UPDATE_RESULT:
      return handleElementUpdateResult(message, dispatch);
    
    case EnvelopeMessageType.ELEMENT_CONVERT_RESULT:
      return handleElementConvertResult(message, dispatch);
    
    default:
      return false;
  }
}

/**
 * Handle the result of an element update operation
 */
function handleElementUpdateResult(
  message: EnvelopeBase,
  dispatch: MessagingDispatch
): boolean {
  const data = message.data as {
    success: boolean;
    elementId: string;
    errorMessage?: string;
  };
  
  console.log('[ElementOpsHandler] Received ELEMENT_UPDATE_RESULT:', {
    success: data.success,
    elementId: data.elementId,
    errorMessage: data.errorMessage
  });
  
  // No action needed, the selection state will be refreshed by the extension
  return true;
}

/**
 * Handle the result of an element conversion operation
 */
function handleElementConvertResult(
  message: EnvelopeBase,
  dispatch: MessagingDispatch
): boolean {
  const data = message.data as {
    success: boolean;
    elementId: string;
    errorMessage?: string;
  };
  
  console.log('[ElementOpsHandler] Received ELEMENT_CONVERT_RESULT:', {
    success: data.success,
    elementId: data.elementId,
    errorMessage: data.errorMessage
  });
  
  // No action needed, the selection state will be refreshed by the extension
  return true;
}
