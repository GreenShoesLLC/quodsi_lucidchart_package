import { PageStatus } from '../../../types/PageStatus';
import { MessageTypes } from '../MessageTypes';

export interface ModelPayloads {
    [MessageTypes.CONVERT_PAGE]: undefined;

    [MessageTypes.CONVERSION_ERROR]: {
        error: string;
    };

    [MessageTypes.REMOVE_MODEL]: undefined;
    [MessageTypes.MODEL_REMOVED]: undefined;
    [MessageTypes.SIMULATE_MODEL]: {
        scenarioName?: string;  // Add optional scenarioName parameter
    };
    [MessageTypes.SIMULATION_STATUS_UPDATE]: {
        pageStatus: PageStatus;
        newResultsAvailable?: boolean;  // Add optional newResultsAvailable flag
    };
    [MessageTypes.SIMULATION_STATUS_CHECK]: {
        documentId: string;
    };
    [MessageTypes.SIMULATION_STATUS_ERROR]: {
        errorMessage: string;
    };
    [MessageTypes.SIMULATION_STARTED]: {
        documentId: string;
    };
    [MessageTypes.OUTPUT_CREATE_PAGE]: {
        pageName: string;
    };
    [MessageTypes.MARK_RESULTS_VIEWED]: {
        documentId: string;
        scenarioId?: string;  // Optional - if not provided, mark all scenarios as viewed
    };
    [MessageTypes.SIMULATION_RESULTS_ACKNOWLEDGED]: undefined;
    [MessageTypes.VIEW_SIMULATION_RESULTS]: {
        documentId: string;
        scenarioId?: string;  // Optional - if not provided, view all scenarios' results
    };
}
