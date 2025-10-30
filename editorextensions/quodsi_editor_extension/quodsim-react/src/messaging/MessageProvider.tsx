import React, { useReducer, useRef } from "react";
import { messagingReducer, initialState } from "./state";
import { MessagingContext, MessagingDispatchContext } from "./MessageContext";
import { useSendMessage } from "./hooks";

// Import effects
import {
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
 * 2. Message Handling:
 *    - Sets up message listener for communication with the host
 *    - Sends the REACT_APP_READY message when conditions are met
 *    - Manages message deduplication with processedMessageIds ref
 *
 * 3. Panel Initialization:
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
  const hasSentReadyRef = useRef(false);      // Whether REACT_APP_READY has been sent
  const processedMessageIds = useRef(new Set<string>()); // Set of processed message IDs to prevent duplicates

  // Initialize hooks
  const sendMessage = useSendMessage(state, dispatch);

  // Initialize all effects

  // React App Ready effect
  // This effect is responsible for sending the REACT_APP_READY message
  // when initialization is complete. This message tells the host
  // that the React app is fully initialized and ready to receive messages.
  useReactAppReadyEffect(
    state,
    sendMessage,
    hasSentReadyRef
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
    processedMessageIds
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
  useSelection,
  useSimulation,
  useValidation,
} from "./MessageContext";
