import { MessageTypes } from '../MessageTypes';
import { SelectionState } from '../../SelectionState';
import { ModelStructure } from '../../accordion/ModelStructure';
import { ValidationResult } from '../../validation/ValidationTypes';
import { ModelItemData } from './ModelItemData';
import { SimulationObjectType } from 'src/types/elements/SimulationObjectType';
import { DiagramElementType } from 'src/types/DiagramElementType';

interface BaseSelectionPayload {
    selectionState: SelectionState;
    modelStructure?: ModelStructure;
    expandedNodes?: string[];
    validationResult?: ValidationResult;
}


export interface UnconvertedSelectionState {
    pageId: string;
    selectedId: string;  // Single ID since it's a single selection
    elementType: DiagramElementType;
}


export interface SimulationObjectSelectionState {
    pageId: string;
    selectedId: string;  // Single ID since it's a single selection
    objectType: SimulationObjectType;  // Direct use instead of mapping
}

export interface PageSelectionState {
    pageId: string;
}


export interface MultipleSelectionState {
    pageId: string;
    selectedIds: string[];
}


export interface SelectionPayloads {
    // Keep legacy format
    [MessageTypes.SELECTION_CHANGED]: {
        selectionState: SelectionState;  // Old type
        elementData?: ModelItemData[];
        modelStructure?: ModelStructure;
        expandedNodes?: string[];
        validationResult?: ValidationResult;
    };

    [MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL]: {
        pageId: string;  // Just keep the page ID for reference
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
    };

    [MessageTypes.SELECTION_CHANGED_UNCONVERTED]: BaseSelectionPayload & {
        unconvertedSelection: UnconvertedSelectionState;
        modelItemData: ModelItemData;
    };
}