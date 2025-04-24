import {
    MessagePayloads,
    MessageTypes,
    ExtensionMessaging
} from "@quodsi/shared";
import { AppState } from "../../QuodsiApp";
import { authMessageHandlers } from "./auth/authMessageHandlers";
import { selectionMessageHandlers } from "./selection/selectionMessageHandlers";
import { simulationMessageHandlers } from "./simulation/simulationMessageHandlers";

export interface MessageHandlerDependencies {
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    setError: (error: string | null) => void;
    sendMessage: <T extends MessageTypes>(type: T, payload?: MessagePayloads[T]) => void;
}

export type MessageHandler<T extends MessageTypes> = (
    payload: MessagePayloads[T],
    deps: MessageHandlerDependencies
) => void;

// Base message handlers (non-categorized)
const baseMessageHandlers: Partial<{
    [T in MessageTypes]: MessageHandler<T>;
}> = {
    [MessageTypes.REACT_APP_READY]: (data, { setState }) => {
        console.log("[MessageHandlers] Processing REACT_APP_READY");
        setState(prev => ({
            ...prev,
            isReady: true
        }));
    }
};

// Merge all handlers into one object
export const messageHandlers: Partial<{
    [T in MessageTypes]: MessageHandler<T>;
}> = {
    ...baseMessageHandlers,
    ...authMessageHandlers,
    ...selectionMessageHandlers,
    ...simulationMessageHandlers
} as const;

export function registerHandler<T extends MessageTypes>(
    messaging: ExtensionMessaging,
    type: T,
    handler: MessageHandler<T>,
    deps: MessageHandlerDependencies
): void {
    // Keep track of last message timestamp and payload for each type
    const lastProcessed = {
        time: 0,
        payload: ''
    };

    messaging.onMessage(type, (payload: MessagePayloads[T]) => {
        const currentTime = Date.now();
        const currentPayload = JSON.stringify(payload);

        // For selection change messages, implement deduplication
        if (type === MessageTypes.SELECTION_CHANGED) {
            // Ignore duplicate messages within 200ms window
            if (currentTime - lastProcessed.time < 200 &&
                lastProcessed.payload === currentPayload) {
                console.log(`[MessageHandlers] Skipping duplicate ${type} message at ${new Date().toISOString()}`, {
                    timeSinceLastMessage: currentTime - lastProcessed.time,
                    messageType: type
                });
                return;
            }
        }

        // Update tracking
        lastProcessed.time = currentTime;
        lastProcessed.payload = currentPayload;

        // Add debug logging (safely)
        console.log(`[MessageHandlers] Processing message ${type} at ${new Date().toISOString()}`);

        // Process the message
        handler(payload, deps);
    });
}

export function registerMessageHandlers(
    messaging: ExtensionMessaging,
    deps: MessageHandlerDependencies
): void {
    (Object.entries(messageHandlers) as [MessageTypes, MessageHandler<MessageTypes>][])
        .forEach(([type, handler]) => {
            registerHandler(messaging, type, handler, deps);
        });
}