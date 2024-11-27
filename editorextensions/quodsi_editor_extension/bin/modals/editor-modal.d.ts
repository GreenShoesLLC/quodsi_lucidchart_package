import { EditorClient, Modal, ItemProxy } from 'lucid-extension-sdk';
export declare class EditorModal extends Modal {
    private q_objecttype;
    private reactAppReady;
    private firstSelectedItem;
    /**
     * Constructor for the EditorModal class.
     * @param client - The EditorClient instance.
     * @param title - Optional title for the modal.
     * @param firstItem - Optional first selected item to initialize.
     */
    constructor(client: EditorClient, title: string, firstItem: ItemProxy | null, q_objecttype: string | undefined);
    protected frameLoaded(): void;
    protected messageFromFrame(message: any): void;
    private generateMessage;
    sendMessageToReact(): void;
}
