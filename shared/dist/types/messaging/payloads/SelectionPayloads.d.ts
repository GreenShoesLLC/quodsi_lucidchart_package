import { MessageTypes } from '../MessageTypes';
import { SelectionState } from '../../SelectionState';
import { ModelStructure } from '../../accordion/ModelStructure';
import { ValidationResult } from '../../validation/ValidationTypes';
import { ModelItemData } from './ModelItemData';
import { SimulationObjectType } from 'src/types/elements/SimulationObjectType';
import { DiagramElementType } from 'src/types/DiagramElementType';
import { EditorReferenceData } from 'src/types/EditorReferenceData';
interface BaseSelectionPayload {
    selectionState: SelectionState;
    modelStructure?: ModelStructure;
    expandedNodes?: string[];
    validationResult?: ValidationResult;
    documentId: string;
}
export interface UnconvertedSelectionState {
    pageId: string;
    selectedId: string;
    diagramElementType: DiagramElementType;
}
export interface SimulationObjectSelectionState {
    pageId: string;
    selectedId: string;
    objectType: SimulationObjectType;
    diagramElementType: DiagramElementType;
}
export interface PageSelectionState {
    pageId: string;
}
export interface MultipleSelectionState {
    pageId: string;
    selectedIds: string[];
}
export interface SelectionPayloads {
    [MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL]: {
        pageId: string;
    };
    [MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL]: BaseSelectionPayload & {
        pageSelection: PageSelectionState;
        modelStructure: ModelStructure;
        modelItemData: ModelItemData;
    };
    [MessageTypes.SELECTION_CHANGED_MULTIPLE]: BaseSelectionPayload & {
        multipleSelection: MultipleSelectionState;
        modelItemData: ModelItemData[];
    };
    [MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT]: BaseSelectionPayload & {
        simulationSelection: SimulationObjectSelectionState;
        modelItemData: ModelItemData;
        modelStructure: ModelStructure;
        referenceData?: EditorReferenceData;
    };
    [MessageTypes.SELECTION_CHANGED_UNCONVERTED]: BaseSelectionPayload & {
        unconvertedSelection: UnconvertedSelectionState;
        modelItemData: ModelItemData;
    };
}
export {};
//# sourceMappingURL=SelectionPayloads.d.ts.map