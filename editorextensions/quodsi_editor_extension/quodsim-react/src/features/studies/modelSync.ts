import { ModelSyncError } from 'quodsi_studio/platforms/lucid-host'
import type { LucidModalHost, ModelSyncResult } from './lucidModalHost'

/**
 * Ask the extension for a fresh model sync (upsert + snapshot push) and settle on its
 * first reply: the Advisor Workspace awaits this after an Apply and before Check, Agree and
 * Run, so the server's copy follows the diagram (spec 2026-10-16 advisor-workspace; final
 * review I1). A sync that didn't save rejects (spec 2026-10-25 advisor tasks in Lucid, call 4),
 * and so does the MODEL_SYNC_TIMEOUT_MS timeout: a slow sync must not hang the card. Only a
 * reply with a `userMessage` (a line meant for her) rejects with a ModelSyncError carrying it;
 * any other failure is a plain Error, so the task shows its own sync line. A late reply still
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
      else if (r.userMessage) reject(new ModelSyncError(r.userMessage))
      else reject(new Error(r.error ?? 'sync failed'))
      if (r.synced || r.error !== 'The extension did not answer.') stop()
    }, page)
  })
}
