import { ModelStructure } from './ModelStructure';
import { ValidationState } from './ValidationState';
import { SelectionType } from '../SelectionType';
export interface AccordionState {
    modelStructure: ModelStructure | null;
    validationState: ValidationState | null;
    currentElement: {
        data: any;
        metadata: any;
    } | null;
    selectionState: {
        selectedIds: string[];
        selectionType: SelectionType;
    };
}
//# sourceMappingURL=AccordionState.d.ts.map