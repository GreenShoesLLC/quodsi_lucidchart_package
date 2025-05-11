import { MessageTypes } from '../MessageTypes';
import { JsonSerializable } from '../JsonTypes';

/**
 * Type guard to check if a message is valid
 */
export function isValidMessage(message: any): message is { messagetype: MessageTypes; data: JsonSerializable } {
    return message
        && typeof message === 'object'
        && 'messagetype' in message
        && Object.values(MessageTypes).includes(message.messagetype);
}
