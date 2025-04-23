import { MessageTypes } from '../MessageTypes';
import { SelectionState } from '../../SelectionState';
import { ValidationResult } from '../../validation/ValidationTypes';
import { ModelItemData } from './ModelItemData';
import { DiagramElementType } from '../../../types/DiagramElementType';
import { EditorReferenceData } from '../../../types/EditorReferenceData';
import { SelectionType } from 'src/types/SelectionType';


export interface SelectionChangedPayload {
    selectionType: SelectionType;
    selectionState: SelectionState;
    validationResult?: ValidationResult;
    documentId: string;

    // Optional selection-specific fields
    diagramElementType?: DiagramElementType;

    // Data fields
    modelItemData?: ModelItemData | ModelItemData[];
    referenceData?: EditorReferenceData;
    // Flag for model existence
    hasModel?: boolean;
}
export interface SelectionPayloads {
    [MessageTypes.SELECTION_CHANGED]: SelectionChangedPayload;
}