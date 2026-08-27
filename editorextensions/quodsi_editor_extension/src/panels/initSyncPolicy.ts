// Whether the right-dock panel may run its init-time model upsert/sync now.
//
// The sync goes through LucidDataActionUtility.performDataAction, whose OAuth
// workaround opens Lucid's own consent modal, and the data action itself
// needs a Kinde token. Run before auth on a cold load it (a) fails with a
// generic "network" error and (b) leaves an OAuth modal on Lucid's dialog
// stack, so the user's Sign-in click stacks a second one and Lucid throws
// DialogStackingError — the button "does nothing" (ClickUp 86e304r34).
// AuthHandler.registerAuthReadyListener already retries the sync once auth
// lands, so before auth the right move is to DEFER, not to try.

export type InitSyncPlan = 'sync' | 'defer' | 'skip';

export function planInitSync(ctx: { isQuodsiModel: boolean; isAuthenticated: boolean }): InitSyncPlan {
  if (!ctx.isQuodsiModel) return 'skip';
  return ctx.isAuthenticated ? 'sync' : 'defer';
}
