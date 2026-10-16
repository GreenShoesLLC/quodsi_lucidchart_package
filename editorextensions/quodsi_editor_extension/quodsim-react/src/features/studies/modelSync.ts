import type { LucidModalHost, ModelSyncResult } from './lucidModalHost'

/**
 * Ask the extension for a fresh model sync (upsert + snapshot push) and resolve on its
 * first reply: the Advisor Workspace awaits this after an Apply and before Check, so the
 * server's copy follows the diagram (spec 2026-10-16 advisor-workspace; final review I1).
 * A timeout resolves too -- a slow sync must not hang the card -- while a late reply still
 * reaches `onResult`. `page` names the page to sync; `{}` means the last Studies open's.
 */
export function syncModelOnce(
  host: LucidModalHost,
  page: { documentId?: string; pageId?: string },
  onResult?: (r: ModelSyncResult) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const stop = host.requestModelSync((r) => {
      onResult?.(r)
      resolve()
      if (r.synced || r.error !== 'The extension did not answer.') stop()
    }, page)
  })
}
