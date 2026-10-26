import { LAYOUT_SCALE, scaleLayout, sizeForLucid } from '../../src/core/lucidDrawSizing';

describe('sizeForLucid', () => {
  it('gives an unsized block the layout node size, then scales the layout', () => {
    const out = sizeForLucid({
      name: 'Diner',
      activities: [{ id: 'a1', name: 'Wait for a table and seat guests', x: 200, y: 0 }],
      resources: [{ id: 'r1', name: 'Tables', x: 0, y: 200 }],
    });
    expect(out.activities[0]).toMatchObject({ x: 300, y: 0, width: 120, height: 120 });
    expect(out.resources[0]).toMatchObject({ x: 0, y: 300, width: 120, height: 120 });
    expect(out.name).toBe('Diner');
  });

  it("keeps a block's own size (the onboarding example's), scaled", () => {
    const doc = { activities: [{ id: 'a1', x: 10, y: 20, width: 120, height: 60 }] };
    expect(sizeForLucid(doc)).toEqual(scaleLayout(doc, LAYOUT_SCALE));
    expect(sizeForLucid(doc).activities[0]).toMatchObject({ width: 180, height: 90 });
  });

  it('leaves a block without a position alone and never mutates the document', () => {
    const doc = { generators: [{ id: 'g1' }] };
    const copy = JSON.parse(JSON.stringify(doc));
    expect(sizeForLucid(doc).generators[0]).toEqual({ id: 'g1' });
    expect(doc).toEqual(copy);
  });
});
