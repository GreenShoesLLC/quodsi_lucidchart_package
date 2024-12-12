import { MessagePayloads, MessageTypes, ExtensionMessaging } from '@quodsi/shared';
import { Panel, EditorClient } from 'lucid-extension-sdk';
export declare abstract class BasePanel extends Panel {
    protected messaging: ExtensionMessaging;
    protected reactAppReady: boolean;
    constructor(client: EditorClient, options: any);
    protected setupBaseMessageHandlers(): void;
    protected onReactReady(): void;
    protected handleAdditionalReactReady(): void;
    protected messageFromFrame(message: any): void;
    protected sendTypedMessage<T extends MessageTypes>(type: T, payload?: MessagePayloads[T]): void;
}
//# sourceMappingURL=BasePanel.d.ts.map