import { PageStatus } from 'src/types/PageStatus';
import { MessageTypes } from '../MessageTypes';

export interface ModelPayloads {
    [MessageTypes.CONVERT_PAGE]: undefined;

    [MessageTypes.CONVERSION_ERROR]: {
        error: string;
    };

    [MessageTypes.REMOVE_MODEL]: undefined;
    [MessageTypes.MODEL_REMOVED]: undefined;
    [MessageTypes.SIMULATE_MODEL]: undefined;
    [MessageTypes.SIMULATION_STATUS_UPDATE]: {
        status: PageStatus;
    };
    [MessageTypes.SIMULATION_STATUS_CHECK]: {
        documentId: string;
    };
    [MessageTypes.SIMULATION_STATUS_ERROR]: {
        error: string;
    };
    [MessageTypes.SIMULATION_STARTED]: {
        documentId: string;
    };
}
