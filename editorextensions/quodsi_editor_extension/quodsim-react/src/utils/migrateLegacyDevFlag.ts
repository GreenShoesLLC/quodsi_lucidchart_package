// quodsim-react/src/utils/migrateLegacyDevFlag.ts
//
// Lucid's panel used its own developer flag, localStorage['quodsi_devtools'],
// while the shared editors inside it read 'quodsi_devmode' (spec 2026-09-15
// §3). This carries a browser that had the old flag on over to the shared
// one, once, before the first render, and drops the old key.

import { setDevMode } from 'quodsi_studio/platforms/shared';

const LEGACY_KEY = 'quodsi_devtools';

export function migrateLegacyDevFlag(): void {
  try {
    if (localStorage.getItem(LEGACY_KEY) === 'true') setDevMode(true);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // no-op: localStorage unavailable
  }
}
