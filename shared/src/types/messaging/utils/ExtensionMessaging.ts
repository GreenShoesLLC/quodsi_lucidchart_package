import { JsonObject } from '../JsonTypes';
import { MessagePayloads, MessageTypes } from "../MessageTypes";
import { ComponentLogger } from '../../../core/logging/ComponentLogger';

// Define a constant for the logger prefix
const LOG_PREFIX = '[ExtensionMessaging]';

export class ExtensionMessaging {
    private static instance: ExtensionMessaging;
    private handlers: Map<MessageTypes, Set<(payload: any) => void>> = new Map();

    public static getInstance(): ExtensionMessaging {
        if (!ExtensionMessaging.instance) {
            ExtensionMessaging.instance = new ExtensionMessaging();
        }
        return ExtensionMessaging.instance;
    }

    /**
     * Private constructor for singleton pattern
     */
    private constructor() {
        // Set logging to disabled by default
        this.setLogging(false);
    }

    /**
     * Enable or disable logging for this component
     */
    public setLogging(enabled: boolean): void {
        ComponentLogger.setEnabled(LOG_PREFIX, enabled);
    }

    /**
     * Creates a serializable message. At runtime, enums will serialize to their string values.
     */
    private createSerializableMessage<T extends MessageTypes>(
        type: T,
        payload?: MessagePayloads[T]
    ): JsonObject {
        return {
            messagetype: type,
            data: payload ?? null
        } as JsonObject;
    }

    public handleIncomingMessage(message: any): void {
        ComponentLogger.log(LOG_PREFIX, 'Received incoming message:', message);
        if (!message?.messagetype) {
            ComponentLogger.warn(LOG_PREFIX, 'Message missing messagetype:', message);
            return;
        }

        const handlers = this.handlers.get(message.messagetype);
        if (handlers) {
            ComponentLogger.log(LOG_PREFIX, `Found ${handlers.size} handlers for incoming message type: ${message.messagetype}`);
            handlers.forEach(handler => handler(message.data));
        } else {
            ComponentLogger.warn(LOG_PREFIX, `No handlers found for incoming message type: ${message.messagetype}`);
        }
    }

    public onMessage<T extends MessageTypes>(
        type: T,
        handler: (payload: MessagePayloads[T]) => void
    ): () => void {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }

        this.handlers.get(type)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.handlers.get(type)?.delete(handler);
        };
    }

    public sendMessage<T extends MessageTypes>(
        type: T,
        payload?: MessagePayloads[T]
    ): void {
        ComponentLogger.log(LOG_PREFIX, 'Sending message:', { type, payload });
        try {
            // First, notify any local handlers
            const handlers = this.handlers.get(type);
            if (handlers) {
                handlers.forEach(handler => handler(payload));
            }

            // Then, send to parent window
            const message = this.createSerializableMessage(type, payload);
            window.parent.postMessage(message, "*");
            ComponentLogger.log(LOG_PREFIX, 'Message posted to parent window');
        } catch (error) {
            ComponentLogger.error(LOG_PREFIX, 'Failed to send message:', error);
            throw error;
        }
    }
}