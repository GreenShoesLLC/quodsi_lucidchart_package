import { MessagePayloads, MessageTypes } from "src/types/MessageTypes";
export declare class ExtensionMessaging {
    private static instance;
    private handlers;
    static getInstance(): ExtensionMessaging;
    handleIncomingMessage(message: any): void;
    onMessage<T extends MessageTypes>(type: T, handler: (payload: MessagePayloads[T]) => void): () => void;
    sendMessage<T extends MessageTypes>(type: T, payload?: MessagePayloads[T]): void;
}
//# sourceMappingURL=ExtensionMessaging.d.ts.map