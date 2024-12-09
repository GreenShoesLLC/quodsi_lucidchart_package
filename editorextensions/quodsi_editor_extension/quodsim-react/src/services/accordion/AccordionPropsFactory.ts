import { AccordionState } from '@quodsi/shared';

export const createAccordionProps = (
    state: AccordionState,
    handlers: {
        onElementSelect: (elementId: string) => void;
        onValidate: () => void;
        onUpdate: (elementId: string, data: any) => void;
    }
) => ({
    modelStructure: state.modelStructure,
    validationState: state.validationState,
    currentElement: state.currentElement,
    selectionState: state.selectionState,
    onElementSelect: handlers.onElementSelect,
    onValidate: handlers.onValidate,
    onUpdate: handlers.onUpdate
});