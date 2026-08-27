// Panel-init model sync must not run before Kinde auth: the data action's
// OAuth workaround opens Lucid's consent modal, the unauthenticated call
// fails, and the next Sign-in click stacks a second OAuth modal that Lucid
// rejects (DialogStackingError) — ClickUp 86e304r34.
import { planInitSync } from '../../src/panels/initSyncPolicy';

describe('planInitSync', () => {
  it('syncs immediately when the page is a Quodsi model and auth is established', () => {
    expect(planInitSync({ isQuodsiModel: true, isAuthenticated: true })).toBe('sync');
  });
  it('defers to the auth-ready retry when not yet authenticated', () => {
    expect(planInitSync({ isQuodsiModel: true, isAuthenticated: false })).toBe('defer');
  });
  it('skips entirely for a page that is not a Quodsi model', () => {
    expect(planInitSync({ isQuodsiModel: false, isAuthenticated: true })).toBe('skip');
    expect(planInitSync({ isQuodsiModel: false, isAuthenticated: false })).toBe('skip');
  });
});
