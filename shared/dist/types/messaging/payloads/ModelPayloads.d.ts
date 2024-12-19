import { MessageTypes } from '../MessageTypes';
export interface ModelPayloads {
    [MessageTypes.CONVERT_PAGE]: undefined;
    [MessageTypes.CONVERSION_ERROR]: {
        error: string;
    };
    [MessageTypes.REMOVE_MODEL]: undefined;
    [MessageTypes.MODEL_REMOVED]: undefined;
    [MessageTypes.SIMULATE_MODEL]: undefined;
}
//# sourceMappingURL=ModelPayloads.d.ts.map