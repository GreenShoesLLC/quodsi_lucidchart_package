import { JsonSerializable } from '../JsonTypes';
import { MessageTypes } from '../MessageTypes';
export interface AppLifecyclePayloads {
    [MessageTypes.REACT_APP_READY]: undefined;
    [MessageTypes.ERROR]: {
        error: string;
        details?: JsonSerializable;
    };
}
//# sourceMappingURL=AppLifecyclePayloads.d.ts.map