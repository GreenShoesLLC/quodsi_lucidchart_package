import { useCallback } from 'react';
import { EnvelopeMessageType } from '@quodsi/shared';
import { useMessaging } from '../MessageProvider';
import { debugService } from '../utils/debugService';

/**
 * Custom hook that provides a type-safe message sender
 * This is the foundation for all the specific message sender utilities
 * 
 * @returns A function to send messages to the host
 */
export function useSender() {
  const { sendMessage } = useMessaging();
  
  /**
   * Send a typed message to the host
   * 
   * @param type Message type
   * @param data Message payload
   */
  const send = useCallback(<T extends EnvelopeMessageType>(
    type: T,
    data?: any
  ) => {
    debugService.debug(`Sending message: ${type}`, data);
    sendMessage(type, data);
  }, [sendMessage]);
  
  return send;
}
