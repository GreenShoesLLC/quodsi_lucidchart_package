import { JsonSerializable } from '../JsonTypes';
import { MessageTypes } from '../MessageTypes';
import { SimulationObjectType } from '../../elements/SimulationObjectType';



export interface ModelItemPayloads {
    [MessageTypes.CONVERT_ELEMENT]: {
        elementId: string;
        type: SimulationObjectType;
    };
    [MessageTypes.GET_ELEMENT_DATA]: {
        elementId: string;
    };

    [MessageTypes.UPDATE_ELEMENT_DATA]: {
        elementId: string;
        data: JsonSerializable;
        type: SimulationObjectType;
    };

    [MessageTypes.UPDATE_SUCCESS]: {
        elementId: string;
    };
}