import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { debugService } from '../utils/debugService';
import { mapEnvelopeToAction } from '../mappers';
import { AuthStorageService } from '../../services/AuthStorageService';

const logger = debugService.forComponent('AuthStatusHandler');

/**
 * Specialized handler for AUTH_STATUS messages
 * These messages need special handling for deduplication and storage
 */
export function handleAuthStatus(
  msg: EnvelopeBase, 
  state: { app: { panelType?: string } }, 
  dispatch: React.Dispatch<any>
) {
  logger.log(`Received AUTH_STATUS message with data:`, msg.data);
  logger.log(`IMPORTANT: Received AUTH_STATUS in ${state.app.panelType} panel:`, {
    panelType: state.app.panelType,
    isAuthenticated: msg.data && typeof msg.data === 'object' && 'isAuthenticated' in msg.data 
      ? (msg.data as any).isAuthenticated 
      : undefined,
    timestamp: new Date().toISOString()
  });
  
  // Generate a unique ID for this AUTH_STATUS message to avoid skipping duplicates
  // in the case where multiple AUTH_STATUS messages are sent in rapid succession
  msg.id = `auth_${Date.now()}_${Math.random()}`;
  
  // Convert AUTH_STATUS message to action and dispatch immediately
  const action = mapEnvelopeToAction(msg);
  if (action) {
    logger.log("Dispatching AUTH_STATUS action immediately:", action);
    dispatch(action);
    
    // If authenticated, save to localStorage
    if (
      msg.data && 
      typeof msg.data === 'object' && 
      'isAuthenticated' in msg.data && 
      'user' in msg.data &&
      (msg.data as any).isAuthenticated && 
      (msg.data as any).user
    ) {
      try {
        AuthStorageService.saveAuthState(true, (msg.data as any).user);
        logger.log(`Saved AUTH_STATUS to localStorage with authenticated=true`);
      } catch (e) {
        logger.error(`Error saving AUTH_STATUS to localStorage:`, e);
      }
    }
  } else {
    logger.error("Failed to map AUTH_STATUS message to action");
  }
  
  return true; // Indicate we've handled this message
}
