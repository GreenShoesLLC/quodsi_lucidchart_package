import { MessagePayloads, MessageTypes } from "../MessageTypes";
import { createSerializableMessage } from "./MessageCreator";
// import { createSerializableMessage } from "@quodsi/shared";

export class ExtensionMessaging {
    private static instance: ExtensionMessaging;
    private handlers: Map<MessageTypes, Set<(payload: any) => void>> = new Map();

    public static getInstance(): ExtensionMessaging {
        if (!ExtensionMessaging.instance) {
            ExtensionMessaging.instance = new ExtensionMessaging();
        }
        return ExtensionMessaging.instance;
    }

    public handleIncomingMessage(message: any): void {
        console.log('[ExtensionMessaging] Received incoming message:', message);
        if (!message?.messagetype) {
            console.warn('[ExtensionMessaging] Message missing messagetype:', message);
            return;
        }

        const handlers = this.handlers.get(message.messagetype);
        if (handlers) {
            console.log(`[ExtensionMessaging] Found ${handlers.size} handlers for incoming message type: ${message.messagetype}`);
            handlers.forEach(handler => handler(message.data));
        } else {
            console.warn(`[ExtensionMessaging] No handlers found for incoming message type: ${message.messagetype}`);
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
        console.log('[ExtensionMessaging] Sending message:', { type, payload });
        try {
            // First, notify any local handlers
            const handlers = this.handlers.get(type);
            if (handlers) {
                handlers.forEach(handler => handler(payload));
            }

            // Then, send to parent window
            const message = createSerializableMessage(type, payload);
            window.parent.postMessage(message, "*");
            console.log('[ExtensionMessaging] Message posted to parent window');
        } catch (error) {
            console.error('[ExtensionMessaging] Failed to send message:', error);
            throw error;
        }
    }
}