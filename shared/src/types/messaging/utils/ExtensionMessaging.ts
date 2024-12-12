import { MessagePayloads, MessageTypes } from "../MessageTypes";

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
        if (!message?.messagetype) {
            return;
        }

        const handlers = this.handlers.get(message.messagetype);
        if (handlers) {
            // Pass the message data to all registered handlers
            handlers.forEach(handler => handler(message.data));
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
        const handlers = this.handlers.get(type);
        if (handlers) {
            handlers.forEach(handler => handler(payload));
        }
    }
}