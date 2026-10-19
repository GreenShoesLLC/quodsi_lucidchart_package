// quodsim-react/src/features/onboarding/examplePageStore.ts
//
// Which Lucid document the tour belongs to, and the id of its example page,
// per user (spec 2026-10-16 C2/C4; final review ruling 7). The tour state
// (storage.ts) is per user and origin, so every Lucid document a user opens
// sees the same cursor; this record is what keeps the tour in ONE of them:
//   - the panel pauses the tour while another page of that document is
//     current and resumes it when the example page is back (C2);
//   - a panel in any other document neither starts nor follows the tour, and
//     offers the invitation instead; a Resume or Start over there adopts it.
// Kept apart from the shared tour state because it is Lucid-only data the
// shared machine never reads.
//
// Every access is wrapped, as in storage.ts: localStorage throws in a private
// window or with site data blocked, and the blob is untrusted input.

/** v2 adds the owning document; a v1 blob (page id only) is ignored. */
export const EXAMPLE_PAGE_STORAGE_KEY = 'quodsi.onboarding.lucid.examplePage.v2'
const VERSION = 2

/** `pageId` is null until the example loads there, and again once it is
 *  known to be gone (a failed load, a deleted page). */
export type TourOwner = { documentId: string; pageId: string | null }

type Blob = { version: number; users: Record<string, TourOwner> }

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.length > 0

function read(): Blob {
  const empty: Blob = { version: VERSION, users: Object.create(null) as Record<string, TourOwner> }
  try {
    const raw = localStorage.getItem(EXAMPLE_PAGE_STORAGE_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return empty
    const p = parsed as Record<string, unknown>
    if (p.version !== VERSION || typeof p.users !== 'object' || p.users === null || Array.isArray(p.users)) return empty
    for (const [user, entry] of Object.entries(p.users as Record<string, unknown>)) {
      if (typeof entry !== 'object' || entry === null) continue
      const e = entry as Record<string, unknown>
      if (!nonEmpty(e.documentId)) continue
      empty.users[user] = { documentId: e.documentId, pageId: nonEmpty(e.pageId) ? e.pageId : null }
    }
    return empty
  } catch {
    return empty
  }
}

function write(b: Blob): void {
  try {
    localStorage.setItem(EXAMPLE_PAGE_STORAGE_KEY, JSON.stringify({ version: VERSION, users: { ...b.users } }))
  } catch { /* best effort */ }
}

/** The document the tour belongs to, or null when none has claimed it yet. */
export function readTourOwner(userKey: string): TourOwner | null {
  return read().users[userKey] ?? null
}

/** An explicit start in `documentId` claims the tour for it. The example page
 *  id is kept only if the document is already the owner. */
export function adoptTourDocument(userKey: string, documentId: string): void {
  const b = read()
  const current = b.users[userKey]
  b.users[userKey] = { documentId, pageId: current?.documentId === documentId ? current.pageId : null }
  write(b)
}

/** The example page is current in `documentId` (it loaded there, or the
 *  user was taken back to it): that document owns the tour. */
export function writeExamplePage(userKey: string, documentId: string, pageId: string): void {
  const b = read()
  b.users[userKey] = { documentId, pageId }
  write(b)
}

export function readExamplePageId(userKey: string): string | null {
  return readTourOwner(userKey)?.pageId ?? null
}

/** Forget the example page but keep the owner: a failed load leaves the user
 *  on a page of their own choosing, and a stale id would pause the tour off
 *  that page. */
export function clearExamplePageId(userKey: string): void {
  const b = read()
  const current = b.users[userKey]
  if (!current || current.pageId === null) return
  b.users[userKey] = { documentId: current.documentId, pageId: null }
  write(b)
}
