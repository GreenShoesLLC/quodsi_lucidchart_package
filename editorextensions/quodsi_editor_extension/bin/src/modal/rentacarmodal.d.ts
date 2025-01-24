import { DataProxy, DocumentProxy, EditorClient, JsonSerializable, Modal, Viewport } from "lucid-extension-sdk";
export declare class RentACarModal extends Modal {
    private dataProxy;
    private documentProxy;
    private viewport;
    private static icon;
    constructor(client: EditorClient, dataProxy: DataProxy, documentProxy: DocumentProxy, viewport: Viewport);
    protected messageFromFrame(message: JsonSerializable): Promise<void>;
    private getOrCreateCarsCollection;
    private getOrCreateLotsCollection;
    private getOrCreateCollection;
    private getOrCreateDataSource;
    private visualize;
    private loadBlockClasses;
    private getLotAndCarPositions;
    private getCarPositions;
    private drawLots;
    private getOrCreateConditionalFormattingRules;
    private drawCars;
}
//# sourceMappingURL=rentacarmodal.d.ts.map