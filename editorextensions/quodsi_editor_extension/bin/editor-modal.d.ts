import { EditorClient, Modal } from 'lucid-extension-sdk';
export declare class EditorModal extends Modal {
    private q_objecttype;
    private reactAppReady;
    constructor(client: EditorClient);
    protected frameLoaded(): void;
    protected messageFromFrame(message: any): void;
    private sendInitialMessage;
}
