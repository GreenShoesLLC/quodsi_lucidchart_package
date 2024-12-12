import { MessageTypes } from '../MessageTypes';
import { JsonSerializable } from '../JsonTypes';
/**
 * Type guard to check if a message is valid
 */
export declare function isValidMessage(message: any): message is {
    messagetype: MessageTypes;
    data: JsonSerializable;
};
//# sourceMappingURL=MessageValidation.d.ts.map