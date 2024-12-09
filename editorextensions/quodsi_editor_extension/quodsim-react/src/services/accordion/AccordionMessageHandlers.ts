import { MessageTypes, MessagePayloads } from '@quodsi/shared';
import { AccordionState, ModelStructure } from '@quodsi/shared';

export const createAccordionMessageHandlers = (
    setState: React.Dispatch<React.SetStateAction<AccordionState>>,
    sendMessage: (type: MessageTypes, payload?: any) => void
) => ({
    handleInitialState: (data: MessagePayloads[MessageTypes.INITIAL_STATE]) => {
        setState({
            modelStructure: data.modelStructure ?? null,
            validationState: {
                summary: { errorCount: 0, warningCount: 0 },
                messages: []
            },
            currentElement: null,
            selectionState: data.selectionState
        });
    },

    handleSelectionChanged: (data: MessagePayloads[MessageTypes.SELECTION_CHANGED]) => {
        setState(prev => ({
            ...prev,
            selectionState: data.selectionState,
            currentElement: data.elementData?.[0] || null
        }));

        if (data.elementData?.[0]?.id) {
            sendMessage(MessageTypes.GET_ELEMENT_DATA, {
                elementId: data.elementData[0].id
            });
        }
    },

    handleElementData: (data: MessagePayloads[MessageTypes.ELEMENT_DATA]) => {
        setState(prev => ({
            ...prev,
            currentElement: {
                data: data.data,
                metadata: data.metadata
            }
        }));
    },

    handleValidationResult: (data: MessagePayloads[MessageTypes.VALIDATION_RESULT]) => {
        setState(prev => ({
            ...prev,
            validationState: {
                summary: {
                    errorCount: data.messages.filter(m => m.type === 'error').length,
                    warningCount: data.messages.filter(m => m.type === 'warning').length
                },
                messages: data.messages
            }
        }));
    },
});