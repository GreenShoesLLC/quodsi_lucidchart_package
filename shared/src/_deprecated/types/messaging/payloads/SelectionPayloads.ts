import { MessageTypes } from '../MessageTypes';
import { SelectionState } from '../../../../types/SelectionState';
import { ValidationResult } from '../../../../types/validation/ValidationTypes';
import { ModelItemData } from './ModelItemData';
import { DiagramElementType } from '../../../../types/DiagramElementType';
import { EditorReferenceData } from '../../../../types/EditorReferenceData';
import { SelectionType } from 'src/types/SelectionType';
import { JsonSerializable } from '../JsonTypes';

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

    // Additional fields from previous UPDATE_SUCCESS and ERROR
    elementId?: string;
    isProcessing?: boolean;

    // Error handling
    error?: string;
    errorDetails?: JsonSerializable;
}

export interface SelectionPayloads {
    [MessageTypes.SELECTION_CHANGED]: SelectionChangedPayload;
}