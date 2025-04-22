import { useCallback, useEffect, useMemo, useContext, useRef } from "react";
import { ModelContext } from "../contexts/ModelContext";
import { SimulationContext } from "../contexts/SimulationContext";
import { UIContext } from "../contexts/UIContext";
import {
  MessageTypes,
  MessagePayloads,
  ExtensionMessaging,
  isValidMessage
} from "@quodsi/shared";
import { contextMessageHandlers } from '../services/messageHandlers/appMessageHandlers';

// Global flag to track which handlers have been registered
const registeredHandlerTypes: { [key: string]: boolean } = {};

/**
 * Custom hook that handles all messaging with the LucidChart extension
 * This hook is designed to be used without modifying the existing QuodsiApp.tsx
 * It won't actually register handlers with contexts until they're being used in the app
 */
export function useMessaging() {
  // Get dispatch functions from all contexts
  // These will be undefined if the contexts aren't being used yet, which is fine for Phase 1
  const modelContext = useContext(ModelContext);
  const simulationContext = useContext(SimulationContext);
  const uiContext = useContext(UIContext);
  
  // Reference to store instance ID
  const instanceIdRef = useRef<string>(`instance_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  
  // Get a singleton instance of the messaging service
  const messaging = useMemo(() => ExtensionMessaging.getInstance(), []);
  
  // Callback to send messages in a type-safe way
  const sendMessage = useCallback(<T extends MessageTypes>(
    type: T,
    payload?: MessagePayloads[T]
  ) => {
    try {
      messaging.sendMessage(type, payload);
    } catch (error) {
      console.error("[useMessaging] Failed to send message:", error);
      // Only update UI context if it exists
      if (uiContext) {
        uiContext.setError(`Failed to communicate with LucidChart: ${error}`);
      }
    }
  }, [messaging, uiContext]);
  
  // Only set up message handling if all contexts are available
  // This allows us to create this hook without requiring the contexts to be used yet
  useEffect(() => {
    // Skip setup if any context is missing
    if (!modelContext || !simulationContext || !uiContext) {
      console.log("[useMessaging] Skipping message handler setup - contexts not ready");
      return;
    }
    
    const instanceId = instanceIdRef.current;
    console.log(`[useMessaging][${instanceId}] Setting up message handlers`);
    
    // Dependencies to pass to message handlers
    const deps = {
      modelDispatch: modelContext.dispatch,
      simulationDispatch: simulationContext.dispatch,
      uiDispatch: uiContext.dispatch
    };
    
    // Register handlers for message types that we need and aren't already registered
    const handlerEntries = Object.entries(contextMessageHandlers);
    
    // Check if any of the handlers are already registered
    const alreadyRegistered = handlerEntries.some(
      ([type]) => registeredHandlerTypes[type]
    );
    
    if (alreadyRegistered) {
      console.log(`[useMessaging][${instanceId}] Some handlers already registered, skipping setup to avoid duplication`);
      return;
    }
    
    // Register handlers for all message types that have handlers
    handlerEntries.forEach(([typeString, handler]) => {
      const messageType = typeString as MessageTypes;
      
      // Skip if already registered globally
      if (registeredHandlerTypes[messageType]) {
        console.log(`[useMessaging][${instanceId}] Handler for ${messageType} already registered globally, skipping`);
        return;
      }
      
      // Mark as registered globally
      registeredHandlerTypes[messageType] = true;
      
      // Initialize tracking for deduplication
      const lastProcessed = {
        time: 0,
        payload: ""
      };
      
      // Create handler function
      const handlerFunction = (payload: any) => {
        const currentTime = Date.now();
        const currentPayload = JSON.stringify(payload);
        
        // For selection change messages, implement deduplication
        if (messageType === MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT) {
          // Ignore duplicate messages within 200ms window
          if (
            currentTime - lastProcessed.time < 200 &&
            lastProcessed.payload === currentPayload
          ) {
            console.log(
              `[useMessaging][${instanceId}] Skipping duplicate ${messageType} message at ${new Date().toISOString()}`,
              {
                timeSinceLastMessage: currentTime - lastProcessed.time,
                messageType: messageType
              }
            );
            return;
          }
        }
        
        // Update tracking
        lastProcessed.time = currentTime;
        lastProcessed.payload = currentPayload;
        
        // Process the message
        console.log(`[useMessaging][${instanceId}] Processing message ${messageType}`);
        if (handler) {
          // Use type assertion to satisfy TypeScript
          handler(payload, deps);
        } else {
          console.warn(`[useMessaging][${instanceId}] No handler registered for message type: ${messageType}`);
        }
      };
      
      // Register handler with messaging system - the ExtensionMessaging API only allows one handler per type
      // so this will overwrite any previous handlers
      messaging.onMessage(messageType, handlerFunction);
      
      console.log(`[useMessaging][${instanceId}] Registered handler for ${messageType}`);
    });
    
    // Handle window messages
    const handleWindowMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!isValidMessage(message)) {
        return;
      }
      messaging.handleIncomingMessage(message);
    };
    
    window.addEventListener("message", handleWindowMessage);
    
    // Cleanup function
    return () => {
      console.log(`[useMessaging][${instanceId}] Cleaning up message handlers`);
      
      // Clean up window event listener
      window.removeEventListener("message", handleWindowMessage);
      
      // Without an offMessage method, we can't remove handlers directly
      // We'll leave the global registration in place since we can't remove handlers
      
      console.log(`[useMessaging][${instanceId}] Handlers will remain registered until page refresh`);
    };
  }, [messaging, modelContext, simulationContext, uiContext]);
  
  // Return the sendMessage function for use in components
  return { sendMessage };
}
