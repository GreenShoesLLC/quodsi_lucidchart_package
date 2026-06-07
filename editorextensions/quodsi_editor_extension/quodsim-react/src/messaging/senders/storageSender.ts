import { EnvelopeMessageType, StorageProvider } from '@quodsi/lucid-shared';
import { useSender } from './useSender';

/**
 * Custom hook that provides typed functions for sending storage-related messages
 * 
 * @returns Object containing storage message sender functions
 */
export function useStorageSender() {
  const send = useSender();
  
  /**
   * Send a STORAGE_CONNECT_REQUEST message
   * 
   * @param provider Storage provider to connect to
   * @param params Additional connection parameters
   */
  const connectStorage = (
    provider: StorageProvider,
    params?: Record<string, unknown>
  ) => {
    send(EnvelopeMessageType.STORAGE_CONNECT_REQUEST, {
      provider,
      params
    });
  };
  
  /**
   * Send a STORAGE_DISCONNECT message
   * 
   * @param provider Storage provider to disconnect
   */
  const disconnectStorage = (provider: StorageProvider) => {
    send(EnvelopeMessageType.STORAGE_DISCONNECT, {
      provider
    });
  };
  
  return {
    connectStorage,
    disconnectStorage
  };
}
