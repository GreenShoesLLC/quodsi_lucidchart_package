import { JsonObject } from '../JsonTypes';
import { MessageTypes, MessagePayloads } from '../MessageTypes';
/**
 * Creates a serializable message. At runtime, enums will serialize to their string values.
 */
export declare function createSerializableMessage<T extends MessageTypes>(type: T, payload?: MessagePayloads[T]): JsonObject;
//# sourceMappingURL=MessageCreator.d.ts.map