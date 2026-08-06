/**
 * Tests for buildRelayConnectors.
 *
 * As of the 2026.08.20 flat-connector canonicalization, the serializer emits
 * a single top-level `connectors[]` array (covering both activity-sourced and
 * generator-sourced connectors) — buildRelayConnectors just maps + dedupes it.
 */

import { buildRelayConnectors } from './buildRelayConnectors';

describe('buildRelayConnectors', () => {
  it('maps a top-level connector entry (e.g. a generator-to-activity connector)', () => {
    const model: any = {
      connectors: [{ id: 'c1', name: 'Gen → Act', sourceId: 'gen1', targetId: 'act1', weight: 1 }],
    };

    const connectors = buildRelayConnectors(model);

    expect(connectors).toHaveLength(1);
    const entry = connectors[0];
    expect(entry.id).toBe('c1');
    expect(entry.sourceId).toBe('gen1');
    expect(entry.targetId).toBe('act1');
  });

  it('includes multiple top-level connectors', () => {
    const model: any = {
      connectors: [
        { id: 'c1', name: 'C1 → Act2', sourceId: 'act1', targetId: 'act2', weight: 1 },
        { id: 'c2', name: 'Gen → Act1', sourceId: 'gen1', targetId: 'act1', weight: 1 },
      ],
    };

    const connectors = buildRelayConnectors(model);

    expect(connectors).toHaveLength(2);
    const ids = connectors.map((c: { id: string }) => c.id);
    expect(ids).toContain('c1');
    expect(ids).toContain('c2');
  });

  it('returns an empty list when there are no connectors', () => {
    const model: any = { connectors: [] };

    const connectors = buildRelayConnectors(model);

    expect(connectors).toHaveLength(0);
  });

  it('deduplicates connectors that appear more than once by id', () => {
    const model: any = {
      connectors: [
        { id: 'c1', name: 'C1' },
        { id: 'c1', name: 'C1 duplicate' },
      ],
    };

    const connectors = buildRelayConnectors(model);

    expect(connectors).toHaveLength(1);
    expect(connectors[0].id).toBe('c1');
    expect(connectors[0].name).toBe('C1');
  });

  it('tolerates a missing connectors array', () => {
    const connectors = buildRelayConnectors({});
    expect(connectors).toEqual([]);
  });
});
