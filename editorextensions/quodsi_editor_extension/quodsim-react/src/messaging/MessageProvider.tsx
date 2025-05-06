import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
  useRef
} from "react";
import { v4 as uuid } from "uuid";
import {
  EnvelopeBase,
  EnvelopeMessageType,
  isEnvelope,
  QuodsiUserInfo,
  SubscriptionTier,
  SubscriptionStatus,
  ElementShape,
  SimulationStatus,
} from "@quodsi/shared";
import { debugService } from "./utils/debugService";
import {
  messagingReducer,
  initialState,
  MessagingState,
  MessagingAction,
} from "./reducer";
import { mapEnvelopeToAction } from "./mappers";

// Import the silent authentication hook
import { useSilentAuth } from "../hooks/useSilentAuth";

// Types for the context values
type MessagingContextValue = MessagingState & {
  sendMessage: <T extends EnvelopeMessageType>(type: T, data?: any) => void;
};

type MessagingDispatch = React.Dispatch<MessagingAction>;

// Create the contexts
const MessagingContext = createContext<MessagingContextValue>({
  ...initialState,
  sendMessage: () => {},
});

const MessagingDispatchContext = createContext<MessagingDispatch>(() => {});

// Props for the provider component
interface MessagingProviderProps {
  children: ReactNode;
  initialPanelType?: "auth" | "model";
}

/**
 * MessageProvider component that manages communication with the host
 * and provides state to the application through context.
 */
export const MessageProvider: React.FC<MessagingProviderProps> = ({
  children,
  initialPanelType,
}) => {
  // Initialize state with reducer
  const [state, dispatch] = useReducer(messagingReducer, initialState);
  
  // Track if we've already sent REACT_APP_READY to prevent resending
  const hasSentReadyRef = useRef(false);
  
  // Track if auth has been initialized
  const authInitializedRef = useRef(false);
  
  // Track processed message IDs to prevent duplicate processing
  const processedMessageIds = useRef(new Set<string>());
  
  // Initialize silent authentication
  useSilentAuth();
  
  // Detect when auth initialization is complete (no longer loading)
  useEffect(() => {
    if (state.auth.isLoading === false) {
      console.log('### DIRECT DEBUG ### Auth initialization complete, state:', {
        isAuthenticated: state.auth.isAuthenticated,
        hasUserInfo: !!state.auth.userInfo,
        isLoading: state.auth.isLoading
      });
      
      authInitializedRef.current = true;
    }
  }, [state.auth.isLoading]);
  
  // Detect panel type from URL if not provided
  useEffect(() => {
    if (!state.app.initialized) {
      // Try to determine panel type from URL search params
      const urlParams = new URLSearchParams(window.location.search);
      const panelParam = urlParams.get("panel");

      let detectedType: "auth" | "model" | undefined = initialPanelType;

      if (panelParam) {
        // If panel parameter exists, use it
        detectedType = panelParam.toLowerCase() === "auth" ? "auth" : "model";
      } else if (window.location.pathname.includes("auth")) {
        // Fallback to checking URL path
        detectedType = "auth";
      } else if (!detectedType) {
        // Default to model panel if we can't determine
        detectedType = "model";
      }

      debugService.log(`Detected panel type: ${detectedType}`);
      dispatch({ type: "APP_INITIALIZE", panelType: detectedType });
    }
  }, [initialPanelType, state.app.initialized]);

  // Function to send messages to the host
  const sendMessage = useCallback(
    <T extends EnvelopeMessageType>(type: T, data?: any) => {
      // Create message envelope
      const envelope: EnvelopeBase = {
        id: uuid(),
        type,
        source: state.app.panelType === "auth" ? "auth-iframe" : "model-iframe",
        target: "host",
        version: "1.0",
        data: data || {},
      };

      // Record outgoing requests in state when needed
      if (
        type !== EnvelopeMessageType.REACT_APP_READY &&
        type !== EnvelopeMessageType.LOG
      ) {
        dispatch({
          type: "ADD_PENDING_REQUEST",
          id: envelope.id,
          requestType: type,
        });
      }

      // Send message to parent window
      if (window.parent) {
        debugService.log(`Sending message: ${type}`, envelope);
        window.parent.postMessage(envelope, "*");
      } else {
        debugService.error("No parent window found to send message to");
      }
    },
    [state.app.panelType]
  );

  // Set up message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("### DIRECT DEBUG ### React received raw event:", event);
      const msg = event.data;
      console.log("### DIRECT DEBUG ### React received message data:", msg);
      
      // Skip processing if not a valid envelope
      if (!isEnvelope(msg)) {
        debugService.warn("Received invalid message format:", msg);
        return;
      }
      
      // Deduplicate messages - skip if we've already processed this message ID
      if (msg.id && processedMessageIds.current.has(msg.id)) {
        console.log(`### DIRECT DEBUG ### Skipping duplicate message with ID: ${msg.id}`);
        return;
      }
      
      // Add message ID to processed set
      if (msg.id) {
        processedMessageIds.current.add(msg.id);
        
        // Limit size of the processed IDs set to avoid memory issues
        if (processedMessageIds.current.size > 100) {
          // Convert to array, keep only the most recent 50 IDs
          const ids = Array.from(processedMessageIds.current);
          processedMessageIds.current = new Set(ids.slice(ids.length - 50));
        }
      }

      debugService.log(`Received message: ${msg.type}`, msg);
      
      // Special handling for AUTH_STATUS messages
      if (msg.type === EnvelopeMessageType.AUTH_STATUS) {
        console.log(`### DIRECT DEBUG ### Received AUTH_STATUS message with data:`, msg.data);
      }

      // If this is a response to a request, clean up the pending request
      if (msg.id && state.app.pendingRequests[msg.id]) {
        debugService.log(`Received response for request: ${msg.id}`);
        dispatch({
          type: "REMOVE_PENDING_REQUEST",
          id: msg.id,
        });
      }

      // Convert envelope to action using mappers
      const action = mapEnvelopeToAction(msg);

      // Update state if action was produced
      if (action) {
        debugService.log("Dispatching action:", action);
        dispatch(action);
      }
    };

    // Add message event listener
    window.addEventListener("message", handleMessage);

    // Send REACT_APP_READY when all conditions are met:
    // 1. App is initialized
    // 2. Panel type is determined
    // 3. Auth is initialized (no longer loading)
    // 4. We haven't sent it already
    if (
      state.app.initialized && 
      state.app.panelType && 
      authInitializedRef.current && 
      !hasSentReadyRef.current
    ) {
      console.log("### DIRECT DEBUG ### All conditions met for sending REACT_APP_READY:", {
        appInitialized: state.app.initialized,
        panelType: state.app.panelType,
        authInitialized: authInitializedRef.current,
        isAuthenticated: state.auth.isAuthenticated,
        hasUserInfo: !!state.auth.userInfo
      });
      
      sendMessage(EnvelopeMessageType.REACT_APP_READY, {
        panel: state.app.panelType,
        isAuthenticated: state.auth.isAuthenticated,
        user: state.auth.userInfo,
      });
      
      // Mark as sent so we don't send it again
      hasSentReadyRef.current = true;
      
      console.log("### DIRECT DEBUG ### Sent REACT_APP_READY message with auth state:", {
        isAuthenticated: state.auth.isAuthenticated,
        hasUserInfo: !!state.auth.userInfo
      });
      debugService.log("Sent REACT_APP_READY message");
    } else if (!hasSentReadyRef.current) {
      console.log("### DIRECT DEBUG ### Waiting to send REACT_APP_READY:", {
        appInitialized: state.app.initialized,
        panelType: state.app.panelType,
        authInitialized: authInitializedRef.current,
        authLoading: state.auth.isLoading,
        isAuthenticated: state.auth.isAuthenticated
      });
    }

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [
    sendMessage,
    state.app.initialized,
    state.app.panelType,
    state.auth.isAuthenticated,
    state.auth.userInfo,
    state.app.pendingRequests,
    state.auth.isLoading, // Add this dependency to trigger when auth loading changes
  ]);

  // Create context value with state and utilities
  const contextValue: MessagingContextValue = {
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

/**
 * Hook to access messaging state and utilities
 */
export function useMessaging() {
  return useContext(MessagingContext);
}

/**
 * Hook to access dispatch function for messaging actions
 */
export function useMessagingDispatch() {
  return useContext(MessagingDispatchContext);
}

/**
 * Hook to access authentication state
 */
export function useAuth() {
  const { auth } = useMessaging();
  return auth;
}

/**
 * Hook to access subscription state
 */
export function useSubscription() {
  const { subscription } = useMessaging();
  return subscription;
}

/**
 * Hook to access selection state
 */
export function useSelection() {
  const { selection } = useMessaging();
  return selection;
}

/**
 * Hook to access simulation state
 */
export function useSimulation() {
  const { simulation } = useMessaging();
  return simulation;
}

/**
 * Hook to access validation state
 */
export function useValidation() {
  const { validation } = useMessaging();
  return validation;
}
