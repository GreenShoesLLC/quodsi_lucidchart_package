// Pure URL builders for the compiled modals, apart from the modal classes so they can be
// tested without loading the extension's message routing.

export interface AdvisorModalOpts {
  focusType?: string;
  focusId?: string;
  focusName?: string;
  mode?: string;
  /** The cached server model id, when the host has one: the consult reads the model's
   *  Simulation Project (spec 2026-10-16). */
  modelId?: string;
  /** The page the Advisor was opened from, so its project strip can open Studies. */
  documentId?: string;
  pageId?: string;
}

/**
 * The Advisor modal's URL. Hand-encoded query string: the Lucid extension sandbox
 * has no `URLSearchParams` (smoke 2026-09-04 — `new URLSearchParams()` threw a
 * ReferenceError the router swallowed, so the click did nothing).
 */
export function advisorModalUrl(opts: AdvisorModalOpts & { apiBaseUrl: string }): string {
  const pairs: Array<[string, string]> = [
    ['view', 'advisor'],
    ['apiBaseUrl', opts.apiBaseUrl],
    ['title', 'Ask the Advisor'],
    ['focusType', opts.focusType ?? 'Model'],
    ['focusId', opts.focusId ?? ''],
  ];
  if (opts.focusName) pairs.push(['focusName', opts.focusName]);
  pairs.push(['mode', opts.mode ?? 'definition']);
  if (opts.modelId) pairs.push(['modelId', opts.modelId]);
  if (opts.documentId) pairs.push(['documentId', opts.documentId]);
  if (opts.pageId) pairs.push(['pageId', opts.pageId]);
  return `quodsim-react/index.html?${pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

/**
 * The Studies modal's URL. `tab: 'project'` starts the surface on its Project tab
 * (the Advisor's project strip, spec 2026-10-16). `documentId` lets the modal's
 * onboarding-tour host run only in the document that owns the tour (final
 * review ruling 7). Hand-encoded: the Lucid extension sandbox has no
 * URLSearchParams.
 */
export function studiesModalUrl(opts: { modelId?: string; tab?: 'project'; documentId?: string; pageId?: string; apiBaseUrl: string }): string {
  const pairs: Array<[string, string]> = [
    ['view', 'studies'],
    ['apiBaseUrl', opts.apiBaseUrl],
    ['title', 'What-if Analysis'],
  ];
  if (opts.modelId) pairs.push(['modelId', opts.modelId]);
  if (opts.tab === 'project') pairs.push(['tab', 'project']);
  if (opts.documentId) pairs.push(['documentId', opts.documentId]);
  // Every write the modal sends carries this page (ClickUp 86e381h8g).
  if (opts.pageId) pairs.push(['pageId', opts.pageId]);
  return `quodsim-react/index.html?${pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}
