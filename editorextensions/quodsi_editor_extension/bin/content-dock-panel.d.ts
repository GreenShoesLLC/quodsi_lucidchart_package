import { EditorClient, Panel } from 'lucid-extension-sdk';
export declare class ContentDockPanel extends Panel {
    private static icon;
    private reactAppReady;
    constructor(client: EditorClient, title?: string);
    private sendInitialMessage;
    protected messageFromFrame(message: any): void;
}
