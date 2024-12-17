import { MessagePayloads, MessageTypes } from "../MessageTypes";
export declare class ExtensionMessaging {
    private static instance;
    private handlers;
    static getInstance(): ExtensionMessaging;
    /**
     * Creates a serializable message. At runtime, enums will serialize to their string values.
     */
    private createSerializableMessage;
    handleIncomingMessage(message: any): void;
    onMessage<T extends MessageTypes>(type: T, handler: (payload: MessagePayloads[T]) => void): () => void;
    sendMessage<T extends MessageTypes>(type: T, payload?: MessagePayloads[T]): void;
}
//# sourceMappingURL=ExtensionMessaging.d.ts.map