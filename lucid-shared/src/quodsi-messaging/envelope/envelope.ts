import { EnvelopeMessageType } from './envelopeMessageTypes';

/**
 * Every valid message source, as a RUNTIME value.
 *
 * This is the single source of truth: `MessageSource` is derived from it, and
 * `isEnvelope` validates against it. Do not re-spell this list anywhere else.
 *
 * It used to be a hand-written type union with `isEnvelope` re-spelling the
 * same members as a chain of string comparisons a few lines below. Adding
 * 'pattern-iframe' to the union satisfied the compiler while the validator
 * kept rejecting it, so every message from the pattern-editor modal was
 * dropped as "Invalid message format" -- the modal registered its channel,
 * asked for its snapshot, and then hung forever on "Loading pattern..."
 * because its REACT_APP_READY never got through to mark the channel ready.
 * A type union is compile-time only; a runtime validator needs a runtime list.
 */
export const MESSAGE_SOURCES = [
  'host',
  'model-iframe',
  'auth-iframe',
  'results-iframe',
  'studio-embed-iframe',
  'pattern-iframe',
] as const;

/**
 * Source context for a message. Derived from MESSAGE_SOURCES so the type and
 * the runtime check can never disagree.
 */
export type MessageSource = typeof MESSAGE_SOURCES[number];

/**
 * Every valid message target, as a RUNTIME value. Same sources, plus the
 * fan-out pseudo-target the router understands.
 */
export const MESSAGE_TARGETS = [...MESSAGE_SOURCES, 'broadcast'] as const;

/**
 * Target context for a message. Derived from MESSAGE_TARGETS.
 */
export type MessageTarget = typeof MESSAGE_TARGETS[number];

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
    (MESSAGE_SOURCES as readonly string[]).includes(msg.source) &&
    typeof msg.target === 'string' &&
    (MESSAGE_TARGETS as readonly string[]).includes(msg.target) &&
    msg.version === '1.0' &&
    msg.data !== undefined
  );
}
