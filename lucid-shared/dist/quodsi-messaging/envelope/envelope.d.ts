import { EnvelopeMessageType } from './envelopeMessageTypes';
/**
 * Source context for a message
 */
export type MessageSource = 'host' | 'model-iframe' | 'auth-iframe' | 'results-iframe' | 'studio-embed-iframe';
/**
 * Target context for a message
 */
export type MessageTarget = 'host' | 'model-iframe' | 'auth-iframe' | 'results-iframe' | 'studio-embed-iframe' | 'broadcast';
/**
 * Base envelope interface for all Quodsi messages.
 * This structure is common to all messages in the protocol.
 */
export interface EnvelopeBase {
    /** Unique ID (UUID) that correlates request ↔ response. */
    id: string;
    /** Message type discriminant that selects the payload schema. */
    type: EnvelopeMessageType;
    /** Originating context. */
    source: MessageSource;
    /** Intended recipient. */
    target: MessageTarget;
    /** Protocol version. */
    version: '1.0';
    /** Payload whose structure depends on the message type. */
    data: unknown;
}
/**
 * Type guard to check if a value is a valid EnvelopeBase
 */
export declare function isEnvelope(value: unknown): value is EnvelopeBase;
//# sourceMappingURL=envelope.d.ts.map