/**
 * RED → GREEN tests for buildRelayConnectors.
 *
 * The relay catalog's `connectors` array must include entries for generator→activity
 * connections, even though those are not serialized as connector objects under any
 * activity — they only appear as `ISerializedGenerator.exitConnector` (a bare target
 * activity id string).  Without synthesizing these entries the embedded Studio
 * validation raises a false "Generator must have an exit connector" error.
 */

import { buildRelayConnectors } from './buildRelayConnectors';

describe('buildRelayConnectors', () => {
  it('synthesizes a connector entry for a generator whose exitConnector points to an activity', () => {
    // Model: one generator pointing to one activity; no activity connectors.
    const model: any = {
      generators: [{ id: 'gen1', name: 'MyGen', exitConnector: 'act1' }],
      activities: [{ id: 'act1', name: 'MyAct', connectors: [] }],
    };

    const connectors = buildRelayConnectors(model);

    // Must contain exactly one entry synthesised for the generator exit
    expect(connectors).toHaveLength(1);
    const entry = connectors[0];
    expect(entry.sourceId).toBe('gen1');
    expect(entry.targetId).toBe('act1');
    // Synthetic id must use the expected prefix so callers can identify it
    expect(entry.id).toMatch(/^__gen_exit_gen1/);
  });

  it('also includes activity connectors alongside synthesized generator exit entries', () => {
    // Model: one generator with exitConnector + one activity with its own connector
    const model: any = {
      generators: [{ id: 'gen1', name: 'Gen', exitConnector: 'act1' }],
      activities: [
        {
          id: 'act1',
          name: 'Act1',
          connectors: [
            { id: 'c1', name: 'C1 → Act2', sourceId: 'act1', targetId: 'act2', weight: 1 },
          ],
        },
      ],
    };

    const connectors = buildRelayConnectors(model);

    // Should have the real connector + the synthesized generator connector
    expect(connectors).toHaveLength(2);
    const ids = connectors.map((c: { id: string }) => c.id);
    expect(ids).toContain('c1');
    expect(ids.some((id: string) => id.startsWith('__gen_exit_'))).toBe(true);
  });

  it('does NOT synthesize a connector for a generator with no exitConnector', () => {
    const model: any = {
      generators: [{ id: 'gen1', name: 'Gen' }], // no exitConnector
      activities: [],
    };

    const connectors = buildRelayConnectors(model);

    expect(connectors).toHaveLength(0);
  });

  it('deduplicates activity connectors that appear under multiple activities', () => {
    const model: any = {
      generators: [],
      activities: [
        { id: 'a1', connectors: [{ id: 'c1', name: 'C1' }] },
        { id: 'a2', connectors: [{ id: 'c1', name: 'C1' }] }, // same id
      ],
    };

    const connectors = buildRelayConnectors(model);

    expect(connectors).toHaveLength(1);
    expect(connectors[0].id).toBe('c1');
  });

  it('tolerates missing activities and generators arrays', () => {
    const connectors = buildRelayConnectors({});
    expect(connectors).toEqual([]);
  });

  it('does NOT add a duplicate synthetic entry if the same generator exit already has a real connector id colliding', () => {
    // Extremely unlikely in practice; the synthetic id uses __gen_exit_ prefix so collisions
    // with real connector ids are effectively impossible — but guard the code path anyway.
    const model: any = {
      generators: [{ id: 'gen1', name: 'Gen', exitConnector: 'act1' }],
      activities: [
        {
          id: 'act1',
          connectors: [
            // A real connector whose id happens to collide with the synthetic id
            { id: '__gen_exit_gen1', name: 'Collision', sourceId: 'x', targetId: 'y', weight: 2 },
          ],
        },
      ],
    };

    const connectors = buildRelayConnectors(model);

    // The real connector wins; no duplicate
    expect(connectors).toHaveLength(1);
    expect(connectors[0].sourceId).toBe('x'); // real connector kept
  });
});
