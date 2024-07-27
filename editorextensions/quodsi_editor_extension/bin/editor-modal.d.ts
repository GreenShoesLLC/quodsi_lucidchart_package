import { EditorClient, Modal } from 'lucid-extension-sdk';
export declare class EditorModal extends Modal {
    constructor(client: EditorClient);
    protected messageFromFrame(message: any): void;
}
