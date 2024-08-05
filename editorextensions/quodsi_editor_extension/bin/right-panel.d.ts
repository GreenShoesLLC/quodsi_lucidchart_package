import { EditorClient, Panel } from 'lucid-extension-sdk';
export declare class RightPanel extends Panel {
    private static icon;
    private reactAppReady;
    constructor(client: EditorClient);
    sendMessageToReact(q_objecttype: string | undefined): void;
    protected messageFromFrame(message: any): void;
}
