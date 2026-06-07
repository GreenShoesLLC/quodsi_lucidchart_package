import { createSeizeAction } from '../../../../src/types/elements/actions/SeizeAction';

describe('action factories assign ids (lucid legacy shared)', () => {
  it('createSeizeAction generates a non-empty string id', () => {
    const a = createSeizeAction('rr1');
    expect(typeof a.id).toBe('string');
    expect(a.id.length).toBeGreaterThan(0);
  });
  it('honors an explicit id', () => {
    const a = createSeizeAction('rr1', null, 'given');
    expect(a.id).toBe('given');
  });
});
