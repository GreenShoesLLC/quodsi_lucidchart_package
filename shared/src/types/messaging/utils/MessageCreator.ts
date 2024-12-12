import { JsonObject } from '../JsonTypes';
import { MessageTypes, MessagePayloads } from '../MessageTypes';

/**
 * Creates a serializable message. At runtime, enums will serialize to their string values.
 */
export function createSerializableMessage<T extends MessageTypes>(
    type: T,
    payload?: MessagePayloads[T]
): JsonObject {
    return {
        messagetype: type,
        data: payload ?? null
    } as JsonObject;
}
