/**
 * Message Mappers
 * Functions to map between envelope messages and state actions
 */

import { EnvelopeBase, EnvelopeMessageType } from "@quodsi/shared";
import { 
  MessagingAction,
  AppAction,
  AuthAction,
  SelectionAction,
  SubscriptionAction,
  SimulationAction,
  ValidationAction,
  QuodsiUserInfo,
  SimulationStatus,
  SubscriptionStatus,
  SubscriptionTier
} from "./state";
import { debugService } from "./utils/debugService";

/**
 * Maps envelope messages received from the extension host to reducer actions
 * @param envelope The message envelope to map
 * @returns A MessagingAction or null if the message doesn't map to an action
 */
export function mapEnvelopeToAction(envelope: EnvelopeBase): MessagingAction | null {
  try {
    // Use safe access to data with defaults to prevent TypeScript errors
    const data = envelope.data || {};
    
    switch (envelope.type) {
      // Authentication messages
      case EnvelopeMessageType.AUTH_STATUS: {
        // Use a type assertion or additional verification for data
        const authData = data as { isAuthenticated?: boolean; user?: QuodsiUserInfo };
        return {
          type: 'AUTH_STATUS_UPDATE',
          isAuthenticated: authData.isAuthenticated === true, // Ensure boolean
          userInfo: authData.user
        } as AuthAction;
      }
        
      case EnvelopeMessageType.AUTH_LOGIN_SUCCESS: {
        const loginData = data as { user?: QuodsiUserInfo };
        return {
          type: 'AUTH_STATUS_UPDATE',
          isAuthenticated: true,
          userInfo: loginData.user
        } as AuthAction;
      }
        
      case EnvelopeMessageType.AUTH_LOGOUT:
        return {
          type: 'AUTH_STATUS_UPDATE',
          isAuthenticated: false,
          userInfo: undefined
        } as AuthAction;
        
      case EnvelopeMessageType.AUTH_ERROR: {
        const errorData = data as { message?: string };
        return {
          type: 'AUTH_ERROR',
          error: errorData.message || 'Unknown authentication error'
        } as AuthAction;
      }
        
      // Selection and context messages
      case EnvelopeMessageType.SELECTION_CHANGED: {
        const selectionData = data as { elements?: any[]; totalElements?: number };
        return {
          type: 'SELECTION_UPDATE',
          elements: selectionData.elements || [],
          totalElements: selectionData.totalElements || 0
        } as SelectionAction;
      }
        
      case EnvelopeMessageType.MODEL_CONTEXT: {
        const contextData = data as { 
          documentId?: string; 
          pageId?: string; 
          documentTitle?: string; 
          isQuodsiModel?: boolean;
          metadata?: any;
        };
        
        return {
          type: 'DOCUMENT_CONTEXT_UPDATE',
          documentId: contextData.documentId || '',
          pageId: contextData.pageId || '',
          documentTitle: contextData.documentTitle || 'Untitled Document',
          isQuodsiModel: contextData.isQuodsiModel || false,
          metadata: contextData.metadata
        } as SelectionAction;
      }
        
      // Subscription messages
      case EnvelopeMessageType.SUBSCRIPTION_STATUS: {
        const subData = data as { 
          tier?: string; 
          status?: string; 
          expiresAt?: string;
          features?: string[];
        };
        
        // Map string values to enum values
        const tier = mapSubscriptionTier(subData.tier);
        const status = mapSubscriptionStatus(subData.status);
        
        return {
          type: 'SUBSCRIPTION_STATUS_UPDATE',
          tier,
          status,
          expiresAt: subData.expiresAt,
          features: subData.features
        } as SubscriptionAction;
      }
        
      case EnvelopeMessageType.SUBSCRIPTION_ERROR: {
        const errorData = data as { message?: string };
        return {
          type: 'SUBSCRIPTION_ERROR',
          error: errorData.message || 'Unknown subscription error'
        } as SubscriptionAction;
      }
        
      // Simulation messages
      case EnvelopeMessageType.MODEL_RUN_ACK: {
        const ackData = data as { jobId?: string };
        return {
          type: 'SIMULATION_START',
          jobId: ackData.jobId || `job-${Date.now()}`
        } as SimulationAction;
      }
        
      case EnvelopeMessageType.MODEL_RUN_STATUS: {
        const statusData = data as { 
          status?: string; 
          progress?: number; 
          results?: any;
          message?: string;
        };
        
        if (statusData.status === 'completed') {
          return {
            type: 'SIMULATION_COMPLETE',
            results: statusData.results || {}
          } as SimulationAction;
        } else if (statusData.status === 'running') {
          return {
            type: 'SIMULATION_PROGRESS',
            progress: statusData.progress || 0
          } as SimulationAction;
        } else if (statusData.status === 'error') {
          return {
            type: 'SIMULATION_ERROR',
            error: statusData.message || 'Unknown simulation error'
          } as SimulationAction;
        }
        return null;
      }
        
      // Validation messages
      case EnvelopeMessageType.MODEL_VALIDATION_RESULT: {
        const validationData = data as { isValid?: boolean; errors?: any[] };
        return {
          type: 'VALIDATION_RESULT',
          isValid: validationData.isValid === true,
          errors: validationData.errors || []
        } as ValidationAction;
      }
        
      default:
        // No mapping for this message type
        return null;
    }
  } catch (error) {
    debugService.error('Error mapping envelope to action:', error);
    return null;
  }
}

/**
 * Maps string tier values to the SubscriptionTier enum
 */
function mapSubscriptionTier(tier?: string): SubscriptionTier {
  if (!tier) return SubscriptionTier.FREE;
  
  switch (tier.toLowerCase()) {
    case 'free': return SubscriptionTier.FREE;
    case 'basic': return SubscriptionTier.BASIC;
    case 'pro': return SubscriptionTier.PRO;
    case 'enterprise': return SubscriptionTier.ENTERPRISE;
    default: return SubscriptionTier.FREE;
  }
}

/**
 * Maps string status values to the SubscriptionStatus enum
 */
function mapSubscriptionStatus(status?: string): SubscriptionStatus {
  if (!status) return SubscriptionStatus.ACTIVE;
  
  switch (status.toLowerCase()) {
    case 'active': return SubscriptionStatus.ACTIVE;
    case 'inactive': return SubscriptionStatus.INACTIVE;
    case 'pending': return SubscriptionStatus.PENDING;
    case 'cancelled': return SubscriptionStatus.CANCELLED;
    case 'error': return SubscriptionStatus.ERROR;
    default: return SubscriptionStatus.ACTIVE;
  }
}
