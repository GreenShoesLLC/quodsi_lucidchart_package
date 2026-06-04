import { isScenariosModalEnabled } from './scenariosModalFlag';

describe('isScenariosModalEnabled', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to false (off) when the key is unset', () => {
    expect(isScenariosModalEnabled()).toBe(false);
  });
  it("returns true only when the key is exactly 'true'", () => {
    localStorage.setItem('quodsi_scenarios_modal', 'true');
    expect(isScenariosModalEnabled()).toBe(true);
  });
  it('returns false for any other value', () => {
    localStorage.setItem('quodsi_scenarios_modal', 'yes');
    expect(isScenariosModalEnabled()).toBe(false);
  });
});
