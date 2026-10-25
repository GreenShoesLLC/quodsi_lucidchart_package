import { ModelSyncError } from 'quodsi_studio/platforms/lucid-host'
import type { LucidModalHost, ModelSyncResult } from './lucidModalHost'

/** A failed sync's line when the extension gives no reason. */
export const MODEL_SYNC_FAILED = "Couldn't save your model to Quodsi. Try again."

/**
 * Ask the extension for a fresh model sync (upsert + snapshot push) and settle on its
 * first reply: the Advisor Workspace awaits this after an Apply and before Check, Agree and
 * Run, so the server's copy follows the diagram (spec 2026-10-16 advisor-workspace; final
 * review I1). A sync that didn't save rejects with a ModelSyncError carrying the extension's
 * reason (spec 2026-10-25 advisor tasks in Lucid, call 4), and so does the
 * MODEL_SYNC_TIMEOUT_MS timeout: a slow sync must not hang the card. A late reply still
 * reaches `onResult`. `page` names the page to sync; `{}` means the last Studies open's.
 */
export function syncModelOnce(
  host: LucidModalHost,
  page: { documentId?: string; pageId?: string },
  onResult?: (r: ModelSyncResult) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stop = host.requestModelSync((r) => {
      onResult?.(r)
      if (r.synced) resolve()
      else reject(new ModelSyncError(r.error ?? MODEL_SYNC_FAILED))
      if (r.synced || r.error !== 'The extension did not answer.') stop()
    }, page)
  })
}
