import {
  isEnvelope,
  MESSAGE_SOURCES,
  MESSAGE_TARGETS,
} from '../../src/quodsi-messaging/envelope/envelope';

/**
 * Regression cover for a live bug found by smoke-testing 2026-08-19.
 *
 * `MessageSource`/`MessageTarget` were hand-written type unions, and
 * `isEnvelope` re-spelled the same members as a chain of string comparisons a
 * few lines below. Adding 'pattern-iframe' to the unions satisfied the
 * compiler while the validator kept rejecting it, so every message from the
 * pattern-editor modal was dropped as "Invalid message format": the modal
 * registered its channel and asked for its snapshot, but its REACT_APP_READY
 * never got through to mark the channel ready, so the snapshot sat queued and
 * the modal hung forever on "Loading pattern...".
 *
 * No test caught it because every test in this estate talks to an in-process
 * fake host that never runs `isEnvelope`.
 *
 * The types are now derived from the runtime lists, so the two cannot drift.
 * These tests fail if anyone re-introduces a hand-spelled whitelist.
 */
function envelopeWith(overrides: Record<string, unknown>) {
  return {
    id: 'test-id',
    type: 'REACT_APP_READY',
    source: 'host',
    target: 'model-iframe',
    version: '1.0',
    data: {},
    ...overrides,
  };
}

describe('isEnvelope source/target validation', () => {
  it.each(MESSAGE_SOURCES)('accepts every declared source: %s', (source) => {
    expect(isEnvelope(envelopeWith({ source }))).toBe(true);
  });

  it.each(MESSAGE_TARGETS)('accepts every declared target: %s', (target) => {
    expect(isEnvelope(envelopeWith({ target }))).toBe(true);
  });

  it('accepts a pattern-editor modal envelope end to end', () => {
    // The exact shape the modal sends, and which was being rejected.
    expect(
      isEnvelope({
        id: 'ad930481-cbf9-4d1f-b47d-41c6e1ad65c7',
        type: 'REACT_APP_READY',
        source: 'pattern-iframe',
        target: 'host',
        version: '1.0',
        data: {},
      }),
    ).toBe(true);
  });

  it('still rejects an unknown source', () => {
    expect(isEnvelope(envelopeWith({ source: 'not-a-real-iframe' }))).toBe(false);
  });

  it('still rejects an unknown target', () => {
    expect(isEnvelope(envelopeWith({ target: 'not-a-real-iframe' }))).toBe(false);
  });

  it("does not accept 'broadcast' as a source", () => {
    // broadcast is a fan-out target only; a message can never originate from it.
    expect(isEnvelope(envelopeWith({ source: 'broadcast' }))).toBe(false);
  });
});
