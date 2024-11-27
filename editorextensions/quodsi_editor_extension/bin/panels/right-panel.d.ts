import { EditorClient, Panel } from 'lucid-extension-sdk';
export declare class RightPanel extends Panel {
    private static icon;
    private reactAppReady;
    private isPanelVisible;
    private static readonly PRIOR_STATUS_KEY;
    private static readonly CURRENT_STATUS_KEY;
    constructor(client: EditorClient);
    show(): void;
    hide(): void;
    sendMessageToReact(q_objecttype: string | undefined): void;
    private updatePageStatus;
    private handleComponentTypeChange;
    protected messageFromFrame(message: any): void;
}
