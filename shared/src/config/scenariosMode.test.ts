import { SCENARIOS_DB_AUTHORITATIVE } from './scenariosMode';

describe('SCENARIOS_DB_AUTHORITATIVE', () => {
  it('is a boolean and defaults to false (legacy)', () => {
    expect(typeof SCENARIOS_DB_AUTHORITATIVE).toBe('boolean');
    expect(SCENARIOS_DB_AUTHORITATIVE).toBe(false);
  });
});
