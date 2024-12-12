import { JsonSerializable, JsonObject } from '../JsonTypes';
import { MessageTypes } from '../MessageTypes';
import { EditorReferenceData } from '../../EditorReferenceData';
import { SimulationObjectType } from '../../elements/SimulationObjectType';
import { SelectionState } from '../../SelectionState';
import { ModelStructure } from '../../accordion/ModelStructure';
export interface ElementData {
    id: string;
    data: JsonObject;
    metadata: {
        type: SimulationObjectType;
        version: string;
    };
    name: string | null;
}
export interface ElementPayloads {
    [MessageTypes.SELECTION_CHANGED]: {
        selectionState: SelectionState;
        elementData?: ElementData[];
        modelStructure?: ModelStructure;
        expandedNodes?: string[];
    };
    [MessageTypes.GET_ELEMENT_DATA]: {
        elementId: string;
    };
    [MessageTypes.ELEMENT_DATA]: {
        id: string;
        data: JsonSerializable;
        metadata: JsonSerializable;
        referenceData: EditorReferenceData;
    };
    [MessageTypes.UPDATE_ELEMENT_DATA]: {
        elementId: string;
        data: JsonSerializable;
        type: SimulationObjectType;
    };
    [MessageTypes.UPDATE_SUCCESS]: {
        elementId: string;
    };
    [MessageTypes.ACTIVITY_SAVED]: {
        elementId: string;
        data: JsonSerializable;
    };
    [MessageTypes.CONNECTOR_SAVED]: {
        elementId: string;
        data: JsonSerializable;
    };
    [MessageTypes.ENTITY_SAVED]: {
        elementId: string;
        data: JsonSerializable;
    };
    [MessageTypes.GENERATOR_SAVED]: {
        elementId: string;
        data: JsonSerializable;
    };
    [MessageTypes.RESOURCE_SAVED]: {
        elementId: string;
        data: JsonSerializable;
    };
}
//# sourceMappingURL=ElementPayloads.d.ts.map