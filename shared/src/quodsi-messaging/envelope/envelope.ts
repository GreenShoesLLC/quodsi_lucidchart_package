import { EnvelopeMessageType } from './envelopeMessageTypes';

/**
 * Source context for a message
 */
export type MessageSource = 'host' | 'model-iframe' | 'auth-iframe' | 'results-iframe' | 'studio-embed-spike-iframe';

/**
 * Target context for a message
 */
export type MessageTarget = 'host' | 'model-iframe' | 'auth-iframe' | 'results-iframe' | 'studio-embed-spike-iframe' | 'broadcast';

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
export function isEnvelope(value: unknown): value is EnvelopeBase {
  if (!value || typeof value !== 'object') return false;

  const msg = value as Partial<EnvelopeBase>;

  return (
    typeof msg.id === 'string' && msg.id.length > 0 &&
    typeof msg.type === 'string' && msg.type.length > 0 &&
    typeof msg.source === 'string' &&
    (msg.source === 'host' || msg.source === 'model-iframe' || msg.source === 'auth-iframe' || msg.source === 'results-iframe' || msg.source === 'studio-embed-spike-iframe') &&
    typeof msg.target === 'string' &&
    (msg.target === 'host' || msg.target === 'model-iframe' ||
      msg.target === 'auth-iframe' || msg.target === 'results-iframe' || msg.target === 'studio-embed-spike-iframe' || msg.target === 'broadcast') &&
    msg.version === '1.0' &&
    msg.data !== undefined
  );
}
