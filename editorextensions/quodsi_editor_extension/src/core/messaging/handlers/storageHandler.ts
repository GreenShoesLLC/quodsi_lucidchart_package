import { EnvelopeBase, EnvelopeMessageType, StorageProvider, ConnectionStatus } from '@quodsi/lucid-shared';
import { router } from '../index';

/**
 * Handler for cloud storage related messages
 */
export class StorageHandler {
  /**
   * Current storage connection status
   */
  private static connectionsStatus = {
    googleDrive: {
      status: 'disconnected' as ConnectionStatus,
      user: undefined as string | undefined
    },
    oneDrive: {
      status: 'disconnected' as ConnectionStatus,
      user: undefined as string | undefined
    }
  };

  /**
   * Handle messages related to cloud storage
   * 
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.STORAGE_CONNECT_REQUEST:
        return StorageHandler.handleConnectRequest(msg);
        
      case EnvelopeMessageType.STORAGE_CONNECT_RESULT:
        return StorageHandler.handleConnectResult(msg);
        
      case EnvelopeMessageType.STORAGE_DISCONNECT:
        return StorageHandler.handleDisconnect(msg);
        
      case EnvelopeMessageType.STORAGE_STATUS:
        return StorageHandler.handleStatus(msg);
        
      // Not a storage message
      default:
        return false;
    }
  }
  
  /**
   * Handle storage connection request
   * 
   * @param msg STORAGE_CONNECT_REQUEST message
   * @returns True indicating message was handled
   */
  private static handleConnectRequest(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      provider: StorageProvider;
      params?: Record<string, unknown>;
    };
    
    console.log('[StorageHandler] Storage connection requested', {
      provider: data.provider
    });
    
    // Update status to connecting
    if (data.provider === 'google_drive') {
      StorageHandler.connectionsStatus.googleDrive.status = 'connecting';
    } else {
      StorageHandler.connectionsStatus.oneDrive.status = 'connecting';
    }
    
    // Broadcast status update
    StorageHandler.broadcastStatus();
    
    // TODO: Perform actual connection
    // For now, simulate a connection
    setTimeout(() => {
      // Mock success
      const success = Math.random() > 0.2; // 80% success rate
      const userIdentifier = success ? `user@${data.provider === 'google_drive' ? 'gmail.com' : 'outlook.com'}` : undefined;
      
      if (success) {
        // Update connection status
        if (data.provider === 'google_drive') {
          StorageHandler.connectionsStatus.googleDrive = {
            status: 'connected',
            user: userIdentifier
          };
        } else {
          StorageHandler.connectionsStatus.oneDrive = {
            status: 'connected',
            user: userIdentifier
          };
        }
      } else {
        // Update to error state
        if (data.provider === 'google_drive') {
          StorageHandler.connectionsStatus.googleDrive.status = 'error';
        } else {
          StorageHandler.connectionsStatus.oneDrive.status = 'error';
        }
      }
      
      // Send connect result
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.STORAGE_CONNECT_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          provider: data.provider,
          success,
          userIdentifier,
          error: success ? undefined : 'Failed to authenticate with provider'
        }
      });
      
      // Broadcast updated status
      StorageHandler.broadcastStatus();
    }, 2000);
    
    return true;
  }
  
  /**
   * Handle connection result
   * 
   * @param msg STORAGE_CONNECT_RESULT message
   * @returns True indicating message was handled
   */
  private static handleConnectResult(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      provider: StorageProvider;
      success: boolean;
      userIdentifier?: string;
      error?: string;
    };
    
    console.log('[StorageHandler] Storage connection result', {
      provider: data.provider,
      success: data.success,
      userIdentifier: data.userIdentifier,
      error: data.error
    });
    
    // This is usually sent by the extension, not received
    // But we'll handle it anyway for completeness
    
    return true;
  }
  
  /**
   * Handle storage disconnection request
   * 
   * @param msg STORAGE_DISCONNECT message
   * @returns True indicating message was handled
   */
  private static handleDisconnect(msg: EnvelopeBase): boolean {
    const data = msg.data as { provider: StorageProvider };
    
    console.log('[StorageHandler] Storage disconnection requested', {
      provider: data.provider
    });
    
    // Reset connection status
    if (data.provider === 'google_drive') {
      StorageHandler.connectionsStatus.googleDrive = {
        status: 'disconnected',
        user: undefined
      };
    } else {
      StorageHandler.connectionsStatus.oneDrive = {
        status: 'disconnected',
        user: undefined
      };
    }
    
    // Broadcast status update
    StorageHandler.broadcastStatus();
    
    // TODO: Actually disconnect from service
    
    return true;
  }
  
  /**
   * Handle storage status request/update
   * 
   * @param msg STORAGE_STATUS message
   * @returns True indicating message was handled
   */
  private static handleStatus(msg: EnvelopeBase): boolean {
    console.log('[StorageHandler] Storage status message received');
    
    // This is usually sent by the extension, not received
    // But we'll handle it anyway for completeness
    
    return true;
  }
  
  /**
   * Broadcast current storage status to all panels
   */
  private static broadcastStatus(): void {
    router.send('broadcast', {
      id: '',
      type: EnvelopeMessageType.STORAGE_STATUS,
      source: 'host',
      target: 'broadcast',
      version: '1.0',
      data: {
        googleDrive: { ...StorageHandler.connectionsStatus.googleDrive },
        oneDrive: { ...StorageHandler.connectionsStatus.oneDrive }
      }
    });
  }
  
  /**
   * Get the current storage connection status
   */
  public static getConnectionStatus() {
    return {
      googleDrive: { ...StorageHandler.connectionsStatus.googleDrive },
      oneDrive: { ...StorageHandler.connectionsStatus.oneDrive }
    };
  }
}
