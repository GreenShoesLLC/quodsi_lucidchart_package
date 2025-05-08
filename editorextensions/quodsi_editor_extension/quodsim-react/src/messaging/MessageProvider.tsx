import React, { useReducer, useRef } from "react";
import { messagingReducer, initialState } from "./state";
import { MessagingContext, MessagingDispatchContext } from "./MessageContext";
import { useAuthState, useSendMessage } from "./hooks";
import { useSilentAuth } from "../hooks/useSilentAuth";

// Import effects
import {
  useAuthInitializationEffect,
  useSilentAuthCompletionEffect,
  useAuthStateChangeEffect,
  useInitialAuthCheckEffect,
  useReactAppReadyEffect,
  usePanelTypeDetectionEffect,
  useMessageListenerEffect,
} from "./effects";

// Create a message provider component that manages communication with the host
interface MessageProviderProps {
  children: React.ReactNode;
  initialPanelType?: "auth" | "model";
}

/**
 * MessageProvider component that manages communication with the host
 * and provides state to the application through context.
 * 
 * This component serves as the central orchestrator for the entire messaging system:
 * 
 * 1. State Management:
 *    - Initializes application state with a reducer
 *    - Provides state to all child components via React Context
 * 
 * 2. Authentication Flow:
 *    - Initializes silent authentication via MSAL
 *    - Tracks authentication state with multiple specialized effects
 *    - Ensures auth state is properly synchronized with localStorage
 *    - Uses refs to track the completion of various authentication stages
 * 
 * 3. Message Handling:
 *    - Sets up message listener for communication with the host
 *    - Sends the REACT_APP_READY message when conditions are met
 *    - Manages message deduplication with processedMessageIds ref
 * 
 * 4. Panel Initialization:
 *    - Detects panel type from URL parameters
 *    - Initializes the panel with the correct type
 * 
 * The component uses a modular approach where each responsibility is
 * handled by a specialized hook or effect, making the codebase more maintainable.
 */
export const MessageProvider: React.FC<MessageProviderProps> = ({
  children,
  initialPanelType,
}) => {
  // Initialize state with reducer
  const [state, dispatch] = useReducer(messagingReducer, initialState);

  // Initialize refs for tracking state
  // These refs persist across renders and help track initialization progress
  const hasSentReadyRef = useRef(false);      // Whether REACT_APP_READY has been sent
  const authInitializedRef = useRef(false);   // Whether auth state has been initialized (has lastUpdated)
  const silentAuthCheckCompletedRef = useRef(false); // Whether silent auth check has finished (silentAuthInProgress=false)
  const processedMessageIds = useRef(new Set<string>()); // Set of processed message IDs to prevent duplicates

  // Initialize hooks
  const { ensureAuthState } = useAuthState(state, dispatch);
  const sendMessage = useSendMessage(state, dispatch);

  // Initialize silent auth
  useSilentAuth();

  // Initialize all effects

  // Auth effects
  // These effects collectively manage the auth initialization lifecycle:
  // 1. useInitialAuthCheckEffect: Immediate localStorage check at mount
  // 2. useAuthInitializationEffect: Tracks when auth state gets a lastUpdated timestamp
  // 3. useSilentAuthCompletionEffect: Tracks when silent auth check completes
  // 4. useAuthStateChangeEffect: Comprehensive tracking and redundant safety mechanism
  useInitialAuthCheckEffect(ensureAuthState);
  useAuthInitializationEffect(state, authInitializedRef);
  useSilentAuthCompletionEffect(state, silentAuthCheckCompletedRef);
  useAuthStateChangeEffect(
    state,
    ensureAuthState,
    authInitializedRef,
    silentAuthCheckCompletedRef
  );

  // React App Ready effects
  // This effect is responsible for sending the REACT_APP_READY message
  // when all initialization conditions are met. This message tells the host
  // that the React app is fully initialized and ready to receive messages.
  useReactAppReadyEffect(
    state,
    sendMessage,
    ensureAuthState,
    hasSentReadyRef,
    authInitializedRef,
    silentAuthCheckCompletedRef
  );

  // Initialization effects
  // This effect detects the panel type from URL parameters and initializes the app
  usePanelTypeDetectionEffect(state, dispatch, initialPanelType);

  // Message listener effect
  // This sets up the window message event listener to receive messages from the host
  // It also handles message deduplication and routing to appropriate handlers
  useMessageListenerEffect(
    state,
    dispatch,
    sendMessage,
    ensureAuthState,
    hasSentReadyRef,
    processedMessageIds,
    authInitializedRef,
    silentAuthCheckCompletedRef
  );

  // Create context value with state and utilities
  const contextValue = {
    ...state,
    sendMessage,
  };

  return (
    <MessagingContext.Provider value={contextValue}>
      <MessagingDispatchContext.Provider value={dispatch}>
        {children}
      </MessagingDispatchContext.Provider>
    </MessagingContext.Provider>
  );
};

export {
  useMessaging,
  useMessagingDispatch,
  useAuth,
  useSubscription,
  useSelection,
  useSimulation,
  useValidation,
} from "./MessageContext";
