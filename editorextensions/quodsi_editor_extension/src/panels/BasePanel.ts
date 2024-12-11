import { ExtensionMessaging, MessagePayloads, MessageTypes, isValidMessage, JsonSerializable } from '@quodsi/shared';
import { Panel, EditorClient } from 'lucid-extension-sdk';

export abstract class BasePanel extends Panel {
    protected messaging: ExtensionMessaging;
    protected reactAppReady: boolean = false;

    constructor(client: EditorClient, options: any) {
        super(client, options);
        this.messaging = ExtensionMessaging.getInstance();
        this.setupBaseMessageHandlers();
    }

    protected setupBaseMessageHandlers(): void {
        this.messaging.onMessage(MessageTypes.REACT_APP_READY, () => {
            if (!this.reactAppReady) {
                this.reactAppReady = true;
                this.onReactReady();
                // Allow derived classes to handle additional setup
                this.handleAdditionalReactReady();
            }
        });

        this.messaging.onMessage(MessageTypes.ERROR, (payload) => {
            console.error('[BasePanel] Error received:', payload);
        });
    }

    // Base implementation of React ready handling
    protected onReactReady(): void {
        console.log('[BasePanel] Basic React ready handling');
        // Implement base React ready behavior here
    }

    // Hook for derived classes to add their own React ready handling
    protected handleAdditionalReactReady(): void {
        // Default empty implementation
        // Derived classes can override this if needed
    }

    protected messageFromFrame(message: any): void {
        console.log('[BasePanel] Message received:', message);

        if (!isValidMessage(message)) {
            console.error('[BasePanel] Invalid message format:', message);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: 'Invalid message format'
            });
            return;
        }

        this.messaging.handleIncomingMessage(message);
    }

    protected sendTypedMessage<T extends MessageTypes>(
        type: T,
        payload?: MessagePayloads[T]
    ): void {
        const message = {
            messagetype: type,
            data: payload ?? null
        } as JsonSerializable;  // Type assertion tells TypeScript the enums will serialize correctly

        this.sendMessage(message);
    }
}