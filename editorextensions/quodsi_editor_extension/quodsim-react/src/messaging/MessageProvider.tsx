import React, { useReducer, useRef } from 'react';
import { messagingReducer, initialState } from './state';
import { MessagingContext, MessagingDispatchContext } from './MessageContext';
import { useAuthState, useSendMessage } from './hooks';
import { useSilentAuth } from '../hooks/useSilentAuth';

// Import effects
import {
  useAuthInitializationEffect,
  useAuthLoadingCycleEffect,
  useAuthStateChangeEffect,
  useInitialAuthCheckEffect,
  useReactAppReadyEffect,
  useEmergencyReactAppReadyEffect,
  usePanelTypeDetectionEffect,
  useAuthTimeoutEffect,
  useMessageListenerEffect
} from './effects';

// Create a message provider component that manages communication with the host
interface MessageProviderProps {
  children: React.ReactNode;
  initialPanelType?: "auth" | "model";
}

/**
 * MessageProvider component that manages communication with the host
 * and provides state to the application through context.
 */
export const MessageProvider: React.FC<MessageProviderProps> = ({
  children,
  initialPanelType,
}) => {
  // Initialize state with reducer
  const [state, dispatch] = useReducer(messagingReducer, initialState);
  
  // Initialize refs
  const hasSentReadyRef = useRef(false);
  const authInitializedRef = useRef(false);
  const authLoadingCycleCompletedRef = useRef(false);
  const processedMessageIds = useRef(new Set<string>());
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize hooks
  const { ensureAuthState } = useAuthState(state, dispatch);
  const sendMessage = useSendMessage(state, dispatch);
  
  // Initialize silent auth
  useSilentAuth();
  
  // Initialize all effects
  
  // Auth effects
  useInitialAuthCheckEffect(ensureAuthState);
  useAuthInitializationEffect(state, authInitializedRef);
  useAuthLoadingCycleEffect(state, authLoadingCycleCompletedRef);
  useAuthStateChangeEffect(state, ensureAuthState, authInitializedRef, authLoadingCycleCompletedRef);
  
  // React App Ready effects
  useReactAppReadyEffect(state, sendMessage, ensureAuthState, hasSentReadyRef, authInitializedRef, authLoadingCycleCompletedRef);
  useEmergencyReactAppReadyEffect(state, sendMessage, ensureAuthState, hasSentReadyRef, authInitializedRef, authLoadingCycleCompletedRef);
  
  // Initialization effects
  usePanelTypeDetectionEffect(state, dispatch, initialPanelType);
  useAuthTimeoutEffect(state, dispatch, ensureAuthState, authTimeoutRef, authLoadingCycleCompletedRef, authInitializedRef);
  
  // Message listener effect
  useMessageListenerEffect(
    state, 
    dispatch, 
    sendMessage, 
    ensureAuthState, 
    hasSentReadyRef,
    processedMessageIds,
    authInitializedRef,
    authLoadingCycleCompletedRef
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

export { useMessaging, useMessagingDispatch, useAuth, useSubscription, useSelection, useSimulation, useValidation } from './MessageContext';
