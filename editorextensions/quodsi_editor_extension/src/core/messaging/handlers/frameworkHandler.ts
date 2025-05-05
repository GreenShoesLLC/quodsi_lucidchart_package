import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';

/**
 * Handler for framework-related messages (lifecycle, errors, logging)
 */
export class FrameworkHandler {
  /**
   * Handle messages related to framework lifecycle
   * 
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.REACT_APP_READY:
        // This is handled directly by the router
        return false;
        
      case EnvelopeMessageType.ERROR:
        return FrameworkHandler.handleError(msg);
        
      case EnvelopeMessageType.LOG:
        return FrameworkHandler.handleLog(msg);
        
      // Not a framework message
      default:
        return false;
    }
  }
  
  /**
   * Handle error messages
   * 
   * @param msg ERROR message
   * @returns True indicating message was handled
   */
  private static handleError(msg: EnvelopeBase): boolean {
    const data = msg.data as { code: string; message: string; id?: string };
    
    console.error(`[FrameworkHandler] Error received: ${data.code}`, {
      message: data.message,
      correlationId: data.id
    });
    
    // TODO: Send to error monitoring service (e.g., Sentry)
    // TODO: Display UI feedback if needed
    
    return true;
  }
  
  /**
   * Handle log messages (development only)
   * 
   * @param msg LOG message
   * @returns True indicating message was handled
   */
  private static handleLog(msg: EnvelopeBase): boolean {
    const data = msg.data as { level: 'debug' | 'info'; text: string };
    
    if (data.level === 'debug') {
      console.debug(`[FrameworkHandler] ${data.text}`);
    } else {
      console.info(`[FrameworkHandler] ${data.text}`);
    }
    
    return true;
  }
}
