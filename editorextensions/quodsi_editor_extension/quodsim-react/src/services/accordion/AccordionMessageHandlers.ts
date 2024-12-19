import { MessageTypes, MessagePayloads } from '@quodsi/shared';
import { AccordionState, ModelStructure } from '@quodsi/shared';

export const createAccordionMessageHandlers = (
    setState: React.Dispatch<React.SetStateAction<AccordionState>>,
    sendMessage: (type: MessageTypes, payload?: any) => void
) => ({

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