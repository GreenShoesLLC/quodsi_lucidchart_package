import { isDevMode } from 'quodsi_studio/platforms/shared';
import { migrateLegacyDevFlag } from '../migrateLegacyDevFlag';

describe('migrateLegacyDevFlag', () => {
  beforeEach(() => localStorage.clear());

  it('turns shared developer mode on for a legacy quodsi_devtools=true and removes the legacy key', () => {
    localStorage.setItem('quodsi_devtools', 'true');
    migrateLegacyDevFlag();
    expect(isDevMode()).toBe(true);
    expect(localStorage.getItem('quodsi_devtools')).toBeNull();
  });

  it('removes a legacy key that is not "true" without turning developer mode on', () => {
    localStorage.setItem('quodsi_devtools', 'false');
    migrateLegacyDevFlag();
    expect(isDevMode()).toBe(false);
    expect(localStorage.getItem('quodsi_devtools')).toBeNull();
  });

  it('changes nothing when there is no legacy key', () => {
    migrateLegacyDevFlag();
    expect(isDevMode()).toBe(false);
    localStorage.setItem('quodsi_devmode', 'true');
    migrateLegacyDevFlag();
    expect(isDevMode()).toBe(true);
  });
});
