import { JsonSerializable } from '../JsonTypes';
import { MessageTypes } from '../MessageTypes';
import { EditorReferenceData } from '../../EditorReferenceData';
import { SimulationObjectType } from '../../elements/SimulationObjectType';
import { MetaData } from 'src/types/MetaData';
export interface ModelItemPayloads {
    [MessageTypes.CONVERT_ELEMENT]: {
        elementId: string;
        type: SimulationObjectType;
    };
    [MessageTypes.GET_ELEMENT_DATA]: {
        elementId: string;
    };
    [MessageTypes.ELEMENT_DATA]: {
        id: string;
        data: JsonSerializable;
        metadata: MetaData;
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
//# sourceMappingURL=ModelItemPayloads.d.ts.map