import { EnvelopeBase } from './envelope';
import { EnvelopeMessageType } from './envelopeMessageTypes';

/**
 * Type guard factory that creates a specialized type guard for a specific message type.
 * 
 * @param type The message type to check for
 * @returns A type guard function checking if the message matches the specified type
 */
export function createMessageTypeGuard<T extends EnvelopeMessageType>(type: T) {
  return function isMessageType(msg: EnvelopeBase): msg is EnvelopeBase & { type: T } {
    return msg.type === type;
  };
}

/**
 * Type guard to check if a message is from a specific source
 * 
 * @param source The source context to check for
 * @returns A type guard function checking if the message is from the specified source
 */
export function isFromSource(source: 'host' | 'model-iframe' | 'auth-iframe') {
  return function (msg: EnvelopeBase): boolean {
    return msg.source === source;
  };
}

/**
 * Type guard to check if a message is targeted to a specific destination
 * 
 * @param target The target context to check for
 * @returns A type guard function checking if the message is for the specified target
 */
export function isForTarget(target: 'host' | 'model-iframe' | 'auth-iframe' | 'broadcast') {
  return function (msg: EnvelopeBase): boolean {
    return msg.target === target;
  };
}

/**
 * Type guard to check if the data property contains required fields
 * 
 * @param requiredFields Array of field names that must exist in the data object
 * @returns A type guard function checking if all required fields are present
 */
export function hasRequiredDataFields(requiredFields: string[]) {
  return function (msg: EnvelopeBase): boolean {
    if (!msg.data || typeof msg.data !== 'object') {
      return false;
    }

    const data = msg.data as Record<string, unknown>;
    return requiredFields.every(field => field in data);
  };
}
