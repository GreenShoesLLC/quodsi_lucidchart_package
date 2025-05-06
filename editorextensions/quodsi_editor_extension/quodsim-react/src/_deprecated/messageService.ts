// src/services/messaging/messageService.ts
import {
  MessageTypes,
  MessagePayloads,
  isValidMessage,
  ExtensionMessaging,
  ComponentLogger
} from "@quodsi/shared";
import {
  MessageHandlerDependencies,
  messageHandlers,
  registerHandler,
  setMessageHandlersLogging
} from "./messageHandlers";
import { actionRequestHandler } from "./actionRequestHandlers";
import { actionResponseHandler } from "./actionResponseHandlers";
import { AppState } from "./QuodsiApp";

// Define a constant for the logger prefix
const LOG_PREFIX = '[MessageService]';

export class MessageService {
  private static instance: MessageService;
  private messaging: ExtensionMessaging;
  private initialized: boolean = false;

  private constructor() {
    this.messaging = ExtensionMessaging.getInstance();
    // Initialize logging
    this.setLogging(false);
  }

  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  /**
   * Enable or disable logging for this service
   */
  public setLogging(enabled: boolean): void {
    ComponentLogger.setEnabled(LOG_PREFIX, enabled);
    // Also set logging for the underlying messaging system
    this.messaging.setLogging(enabled);
    // And for message handlers
    setMessageHandlersLogging(enabled);
  }

  /**
   * Type-safe message sender that uses window.postMessage via ExtensionMessaging
   */
  public sendMessage<T extends MessageTypes>(
    type: T,
    payload?: MessagePayloads[T],
    setState?: React.Dispatch<React.SetStateAction<AppState>>
  ): void {
    try {
      ComponentLogger.log(LOG_PREFIX, 'Sending message:', { type, payload });
      this.messaging.sendMessage(type, payload);
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Failed to send message:', error);
      if (setState) {
        setState((prev) => ({
          ...prev,
          error: `Failed to communicate with LucidChart: ${error}`
        }));
      }
      throw error;
    }
  }

  /**
   * Initialize message handling with required dependencies
   */
  public initMessageHandling(deps: MessageHandlerDependencies): () => void {
    if (this.initialized) {
      ComponentLogger.warn(LOG_PREFIX, 'Message handling already initialized');
      return () => { }; // Return empty cleanup function
    }

    ComponentLogger.log(LOG_PREFIX, 'Setting up message handlers');

    // Merge action handlers with base message handlers
    const allHandlers = {
      ...messageHandlers,
      ...actionRequestHandler,
      ...actionResponseHandler
    };

    // Register all message handlers
    (Object.entries(allHandlers) as [MessageTypes, any][])
      .forEach(([type, handler]) => {
        registerHandler(this.messaging, type, handler, deps);
      });

    // Setup window message listener
    const handleWindowMessage = (event: MessageEvent) => {
      const message = event.data;

      // Check if the message is valid (has a messagetype field)
      if (!isValidMessage(message)) {
        return;
      }

      this.messaging.handleIncomingMessage(message);
    };

    window.addEventListener("message", handleWindowMessage);
    this.initialized = true;

    // Return cleanup function
    return () => {
      window.removeEventListener("message", handleWindowMessage);
      this.initialized = false;
    };
  }

  /**
   * Send the REACT_APP_READY message with auth data
   */
  public sendAppReadyMessage(authData: any): void {
    ComponentLogger.log(LOG_PREFIX, 'Sending REACT_APP_READY with auth data:', {
      panelType: authData.panelType || undefined,
      isAuthenticated: authData.isAuthenticated,
      hasUserInfo: !!authData.userInfo,
    });

    this.sendMessage(MessageTypes.REACT_APP_READY, authData);
  }
}

// Export the instance getter
export const getMessageService = (): MessageService => {
  return MessageService.getInstance();
};