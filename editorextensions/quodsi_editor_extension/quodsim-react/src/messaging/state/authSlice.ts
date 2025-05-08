/**
 * Auth State Slice
 * 
 * This module manages the authentication state within the Quodsi React application.
 * It's responsible for tracking:
 * - Authentication status (logged in or not)
 * - User information
 * - Loading state during authentication operations
 * - Error state for failed authentication attempts
 * - Last updated timestamp for synchronization
 * 
 * The auth state is central to the application and is consumed by:
 * 1. MessageProvider - to determine when to send REACT_APP_READY
 * 2. useSilentAuth hook - to update auth state during background authentication
 * 3. UI components - to display appropriate content based on auth status
 * 4. Communication with the LucidChart extension host
 */

import { QuodsiUserInfo } from './types';

/**
 * AuthState Interface
 * 
 * Defines the structure of the authentication state slice.
 * 
 * @property isAuthenticated - Boolean flag indicating if user is authenticated
 * @property userInfo - Optional user profile information when authenticated
 * @property isLoading - Flag indicating authentication operations in progress
 *                      This is crucial for coordinating async auth operations
 *                      across the messaging system. The MessageProvider uses this
 *                      to know when auth initialization is complete.
 * @property lastUpdated - Timestamp when auth state was last modified
 *                        Used to detect state changes and for synchronization
 * @property error - Optional error message if authentication failed
 */
export interface AuthState {
  isAuthenticated: boolean;
  userInfo?: QuodsiUserInfo;
  isLoading: boolean;
  lastUpdated?: number;
  error?: string;
}

/**
 * Initial Authentication State
 * 
 * Default starting state for the auth slice.
 * - isLoading begins as false, and is explicitly set to true when auth operations start
 * - isAuthenticated begins as false since no user is logged in initially
 * - All other fields are undefined until relevant auth operations occur
 * 
 * NOTE: The useSilentAuth hook will set isLoading to true immediately when it starts
 * checking for existing authentication, and back to false when complete,
 * regardless of whether authentication was successful or not.
 */
export const initialAuthState: AuthState = {
  isAuthenticated: false,
  userInfo: undefined,
  isLoading: false, // Starting as not loading - will be set to true during auth operations
  lastUpdated: undefined,
  error: undefined,
};

/**
 * Auth Action Types
 * 
 * Defines the shape of actions that can modify the auth state.
 * 
 * AUTH_STATUS_UPDATE: Updates the authentication status and user info
 * - Dispatched by:
 *   1. useSilentAuth when background auth check completes
 *   2. When receiving AUTH_STATUS messages from the extension host
 *   3. During explicit login/logout operations
 * - Effects: Updates isAuthenticated flag, userInfo, and sets lastUpdated timestamp
 * 
 * AUTH_LOADING: Sets the authentication loading state
 * - Dispatched by:
 *   1. useSilentAuth at start and end of authentication check
 *   2. During explicit login attempts
 * - Effects: Updates only the isLoading flag
 * - Critical for MessageProvider: When this transitions from true→false,
 *   MessageProvider detects auth initialization completion
 * 
 * AUTH_ERROR: Sets authentication error state
 * - Dispatched when authentication operations fail
 * - Effects: Sets error message and updates lastUpdated timestamp
 */
export type AuthAction = 
  | { type: 'AUTH_STATUS_UPDATE'; isAuthenticated: boolean; userInfo?: QuodsiUserInfo }
  | { type: 'AUTH_LOADING'; isLoading: boolean }
  | { type: 'AUTH_ERROR'; error: string };

/**
 * Auth Reducer Function
 * 
 * Pure function that produces a new auth state based on the current state and dispatched action.
 * 
 * The AuthReducer is a critical component in the auth state management flow:
 * 
 * 1. AUTH_STATUS_UPDATE:
 *    - Updates the core authentication state (isAuthenticated and userInfo)
 *    - Sets lastUpdated timestamp which is used by several components:
 *      a. MessageProvider uses this to know when auth state has been definitively set
 *      b. UI components use this for detecting state changes to trigger re-renders
 *      c. Used to synchronize state across iframe boundaries
 *    - Does NOT modify isLoading (remains unchanged from previous state)
 * 
 * 2. AUTH_LOADING:
 *    - Specifically updates only the isLoading flag
 *    - Key interactions with MessageProvider:
 *      a. When set to true: Signals auth operations are in progress
 *      b. When set to false: Signals auth initialization is complete
 *         (MessageProvider uses this to know when to send REACT_APP_READY)
 *    - Does NOT update lastUpdated as this is a transient state
 * 
 * 3. AUTH_ERROR:
 *    - Sets error message for failed authentication
 *    - Updates lastUpdated to trigger state change detection
 *    - Does NOT modify isLoading (separate concerns)
 * 
 * @param state Current auth state (defaults to initialAuthState if undefined)
 * @param action Action object describing the state change
 * @returns New AuthState object with the applied changes
 */
export function authReducer(state: AuthState = initialAuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_STATUS_UPDATE':
      return {
        ...state,
        isAuthenticated: action.isAuthenticated,
        userInfo: action.userInfo,
        // Update timestamp to indicate definitive auth state change
        // MessageProvider waits for this to be set before sending REACT_APP_READY
        lastUpdated: Date.now(),
      };
    case 'AUTH_LOADING':
      return {
        ...state,
        isLoading: action.isLoading,
        // Deliberately not updating lastUpdated since this is a transient state
        // and we don't want to trigger UI updates just for loading state changes
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        error: action.error,
        lastUpdated: Date.now(),
      };
    default:
      return state;
  }
}
