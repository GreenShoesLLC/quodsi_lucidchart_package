import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';

/**
 * Storage provider type
 */
export type StorageProvider = 'google_drive' | 'onedrive';

/**
 * Connection status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Sent to request cloud storage connection
 */
export interface StorageConnectRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.STORAGE_CONNECT_REQUEST;
  data: {
    /** Storage provider to connect to */
    provider: StorageProvider;

    /** Additional connection parameters */
    params?: Record<string, unknown>;
  };
}

/**
 * Sent with storage connection results
 */
export interface StorageConnectResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.STORAGE_CONNECT_RESULT;
  data: {
    /** Storage provider */
    provider: StorageProvider;

    /** Success flag */
    success: boolean;

    /** User name/email of the connected account */
    userIdentifier?: string;

    /** Error message if connection failed */
    error?: string;
  };
}

/**
 * Sent to request storage disconnection
 */
export interface StorageDisconnectMessage extends EnvelopeBase {
  type: EnvelopeMessageType.STORAGE_DISCONNECT;
  data: {
    /** Storage provider to disconnect */
    provider: StorageProvider;
  };
}

/**
 * Sent to update on storage connection status
 */
export interface StorageStatusMessage extends EnvelopeBase {
  type: EnvelopeMessageType.STORAGE_STATUS;
  data: {
    /** Connection status for Google Drive */
    googleDrive: {
      /** Connection status */
      status: ConnectionStatus;

      /** Connected user if status is 'connected' */
      user?: string;
    };

    /** Connection status for OneDrive */
    oneDrive: {
      /** Connection status */
      status: ConnectionStatus;

      /** Connected user if status is 'connected' */
      user?: string;
    };
  };
}

/** Union type of all storage messages */
export type StorageMessage =
  | StorageConnectRequestMessage
  | StorageConnectResultMessage
  | StorageDisconnectMessage
  | StorageStatusMessage;
