import { ModelMessageBuilder } from './ModelMessageBuilder';
import { MessageTypes } from '@quodsi/shared';

export class ModelPanelAccordionManager {
    /**
     * Sends initial state to the React app with properly structured data
     */
    public sendInitialState(
        pageId: string, 
        documentId: string, 
        isModel: boolean,
        modelData: any,
        selectionState: any,
        canConvert: boolean,
        validationResult: any,
        sendMessage: (message: any) => void
    ): void {
        const message = ModelMessageBuilder.buildInitialStateMessage({
            pageId,
            documentId,
            isModel,
            modelData,
            selectionState,
            canConvert,
            validationResult
        });

        sendMessage({
            messagetype: MessageTypes.INITIAL_STATE,
            data: message
        });
    }
}