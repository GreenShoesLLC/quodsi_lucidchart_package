import { QuodsiUserInfo, SubscriptionTier, SubscriptionStatus, ElementShape, SimulationStatus } from '@quodsi/shared';
import { debugService } from './utils/debugService';
// Import AuthStorageService
import { AuthStorageService } from '../services/AuthStorageService';

/**
 * State structure for the messaging system
 */
export interface MessagingState {
  // Authentication state
  auth: {
    isAuthenticated: boolean;
    userInfo?: QuodsiUserInfo;
    isLoading: boolean;
    error?: string;
    lastUpdated?: number;
  };
  
  // Subscription state
  subscription: {
    tier?: SubscriptionTier;
    status?: SubscriptionStatus;
    expiresAt?: string;
    featureFlags: Record<string, boolean>;
    lastUpdated?: number;
  };
  
  // Selection and document context
  selection: {
    documentId?: string;
    pageId?: string;
    isQuodsiModel: boolean;
    selectedElements: ElementShape[];
    selectionCount: number;
    totalElementCount: number;
    diagramElementType?: string;
    lastUpdated?: number;
  };
  
  // Simulation state
  simulation: {
    status?: SimulationStatus;
    progress: number;
    jobId?: string;
    currentStep?: string;
    error?: string;
    resultUrl?: string;
    lastUpdated?: number;
    isPolling: boolean;
  };
  
  // Model validation state
  validation: {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    messages: Array<{
      type: string;
      message: string;
      elementId?: string;
      code?: string;
    }>;
    lastValidated?: number;
  };
  
  // General app state
  app: {
    initialized: boolean;
    panelType?: 'auth' | 'model';
    error?: string;
    pendingRequests: Record<string, {
      type: string;
      timestamp: number;
    }>;
  };
}

/**
 * Initial state for the messaging reducer
 */
export const initialState: MessagingState = {
  auth: {
    isAuthenticated: false,
    isLoading: true
  },
  subscription: {
    featureFlags: {}
  },
  selection: {
    isQuodsiModel: false,
    selectedElements: [],
    selectionCount: 0,
    totalElementCount: 0
  },
  simulation: {
    progress: 0,
    isPolling: false
  },
  validation: {
    isValid: true,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    messages: []
  },
  app: {
    initialized: false,
    pendingRequests: {}
  }
};

/**
 * Action types for the messaging reducer
 */
export type MessagingAction =
  // App actions
  | { type: 'APP_INITIALIZE'; panelType: 'auth' | 'model' }
  | { type: 'APP_ERROR'; error: string }
  | { type: 'ADD_PENDING_REQUEST'; id: string; requestType: string }
  | { type: 'REMOVE_PENDING_REQUEST'; id: string }
  
  // Auth actions
  | { type: 'AUTH_STATUS_UPDATE'; isAuthenticated: boolean; userInfo?: QuodsiUserInfo }
  | { type: 'AUTH_LOADING'; isLoading: boolean }
  | { type: 'AUTH_ERROR'; error: string }
  
  // Subscription actions
  | { type: 'SUBSCRIPTION_UPDATE'; tier: SubscriptionTier; status: SubscriptionStatus; expiresAt?: string; featureFlags?: Record<string, boolean> }
  
  // Selection actions
  | { type: 'SELECTION_UPDATE'; documentId: string; pageId: string; isQuodsiModel: boolean; selectedElements: ElementShape[]; selectionCount: number; totalElementCount: number; diagramElementType?: string }
  | { type: 'MODEL_CONTEXT_UPDATE'; documentId: string; pageId: string; isQuodsiModel: boolean; title?: string; metadata?: Record<string, unknown> }
  
  // Simulation actions
  | { type: 'SIMULATION_STATUS_UPDATE'; status: SimulationStatus; progress: number; jobId?: string; currentStep?: string; error?: string; resultUrl?: string }
  | { type: 'SIMULATION_START_POLLING'; jobId: string }
  | { type: 'SIMULATION_STOP_POLLING' }
  | { type: 'SIMULATION_ERROR'; error: string }
  
  // Validation actions
  | { type: 'VALIDATION_RESULT'; isValid: boolean; errorCount: number; warningCount: number; infoCount: number; messages: Array<{ type: string; message: string; elementId?: string; code?: string }> };

/**
 * Main reducer function for the messaging system
 * 
 * @param state Current state
 * @param action Action to process
 * @returns New state
 */
export function messagingReducer(state: MessagingState, action: MessagingAction): MessagingState {
  debugService.debug(`Reducer processing action: ${action.type}`);
  
  switch (action.type) {
    // --------- App Actions ---------
    
    case 'APP_INITIALIZE':
      return {
        ...state,
        app: {
          ...state.app,
          initialized: true,
          panelType: action.panelType
        }
      };
      
    case 'APP_ERROR':
      return {
        ...state,
        app: {
          ...state.app,
          error: action.error
        }
      };
      
    case 'ADD_PENDING_REQUEST':
      return {
        ...state,
        app: {
          ...state.app,
          pendingRequests: {
            ...state.app.pendingRequests,
            [action.id]: {
              type: action.requestType,
              timestamp: Date.now()
            }
          }
        }
      };
      
    case 'REMOVE_PENDING_REQUEST':
      const { [action.id]: removedRequest, ...remainingRequests } = state.app.pendingRequests;
      return {
        ...state,
        app: {
          ...state.app,
          pendingRequests: remainingRequests
        }
      };
    
    // --------- Auth Actions ---------
    
    case 'AUTH_STATUS_UPDATE':
      // Persist authentication state to localStorage when it changes
      if (action.isAuthenticated) {
        // Only save to storage when authenticated
        AuthStorageService.saveAuthState(action.isAuthenticated, action.userInfo || null);
      } else if (!action.isAuthenticated) {
        // When signing out, clear storage
        AuthStorageService.clearAuthState();
      }
      
      return {
        ...state,
        auth: {
          ...state.auth,
          isAuthenticated: action.isAuthenticated,
          userInfo: action.userInfo,
          isLoading: false,
          error: undefined,
          lastUpdated: Date.now()
        }
      };
      
    case 'AUTH_LOADING':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: action.isLoading
        }
      };
      
    case 'AUTH_ERROR':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: false,
          error: action.error,
          lastUpdated: Date.now()
        }
      };
    
    // --------- Subscription Actions ---------
    
    case 'SUBSCRIPTION_UPDATE':
      return {
        ...state,
        subscription: {
          ...state.subscription,
          tier: action.tier,
          status: action.status,
          expiresAt: action.expiresAt,
          featureFlags: action.featureFlags || state.subscription.featureFlags,
          lastUpdated: Date.now()
        }
      };
    
    // --------- Selection Actions ---------
    
    case 'SELECTION_UPDATE':
      return {
        ...state,
        selection: {
          ...state.selection,
          documentId: action.documentId,
          pageId: action.pageId,
          isQuodsiModel: action.isQuodsiModel,
          selectedElements: action.selectedElements,
          selectionCount: action.selectionCount,
          totalElementCount: action.totalElementCount,
          diagramElementType: action.diagramElementType,
          lastUpdated: Date.now()
        }
      };
      
    case 'MODEL_CONTEXT_UPDATE':
      return {
        ...state,
        selection: {
          ...state.selection,
          documentId: action.documentId,
          pageId: action.pageId,
          isQuodsiModel: action.isQuodsiModel,
          // Keep existing selected elements information
          lastUpdated: Date.now()
        }
      };
    
    // --------- Simulation Actions ---------
    
    case 'SIMULATION_STATUS_UPDATE':
      return {
        ...state,
        simulation: {
          ...state.simulation,
          status: action.status,
          progress: action.progress,
          jobId: action.jobId || state.simulation.jobId,
          currentStep: action.currentStep,
          error: action.error,
          resultUrl: action.resultUrl,
          lastUpdated: Date.now()
        }
      };
      
    case 'SIMULATION_START_POLLING':
      return {
        ...state,
        simulation: {
          ...state.simulation,
          jobId: action.jobId,
          isPolling: true
        }
      };
      
    case 'SIMULATION_STOP_POLLING':
      return {
        ...state,
        simulation: {
          ...state.simulation,
          isPolling: false
        }
      };
      
    case 'SIMULATION_ERROR':
      return {
        ...state,
        simulation: {
          ...state.simulation,
          error: action.error,
          lastUpdated: Date.now()
        }
      };
    
    // --------- Validation Actions ---------
    
    case 'VALIDATION_RESULT':
      return {
        ...state,
        validation: {
          ...state.validation,
          isValid: action.isValid,
          errorCount: action.errorCount,
          warningCount: action.warningCount,
          infoCount: action.infoCount,
          messages: action.messages,
          lastValidated: Date.now()
        }
      };
    
    default:
      // Return unchanged state for unknown actions
      return state;
  }
}

/**
 * Helper function to extract the base type from an action
 * Useful for logging and tracking
 */
export function getActionType(action: MessagingAction): string {
  return action.type;
}
