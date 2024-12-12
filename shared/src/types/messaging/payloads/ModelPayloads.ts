import { JsonSerializable } from '../JsonTypes';
import { MessageTypes } from '../MessageTypes';

export interface ModelPayloads {
    [MessageTypes.CONVERT_PAGE]: undefined;
    [MessageTypes.CONVERSION_STARTED]: undefined;
    
    [MessageTypes.CONVERSION_COMPLETE]: {
        success: boolean;
        modelId: string;
        elementCount: {
            activities: number;
            generators: number;
            resources: number;
            connectors: number;
        };
    };

    [MessageTypes.CONVERSION_ERROR]: {
        error: string;
    };

    [MessageTypes.MODEL_SAVED]: {
        modelId: string;
        data: JsonSerializable;
    };

    [MessageTypes.MODEL_LOADED]: {
        modelId: string;
        data: JsonSerializable;
    };

    [MessageTypes.REMOVE_MODEL]: undefined;
    [MessageTypes.MODEL_REMOVED]: undefined;
    [MessageTypes.SIMULATE_MODEL]: undefined;
}
