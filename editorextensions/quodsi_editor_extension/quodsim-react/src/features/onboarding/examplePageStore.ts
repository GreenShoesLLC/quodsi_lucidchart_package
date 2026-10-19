// quodsim-react/src/features/onboarding/examplePageStore.ts
//
// The id of the tour's example page, per user (spec 2026-10-16 C2/C4): the
// panel pauses the tour while another page is current and resumes it when the
// example page is back. Kept apart from the shared tour state (storage.ts)
// because it is Lucid-only data the shared machine never reads.
//
// Every access is wrapped, as in storage.ts: localStorage throws in a private
// window or with site data blocked, and the blob is untrusted input.

const KEY = 'quodsi.onboarding.lucid.examplePage.v1'
const VERSION = 1

type Blob = { version: number; users: Record<string, string> }

function read(): Blob {
  const empty: Blob = { version: VERSION, users: Object.create(null) as Record<string, string> }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return empty
    const p = parsed as Record<string, unknown>
    if (p.version !== VERSION || typeof p.users !== 'object' || p.users === null || Array.isArray(p.users)) return empty
    for (const [user, pageId] of Object.entries(p.users as Record<string, unknown>)) {
      if (typeof pageId === 'string' && pageId.length > 0) empty.users[user] = pageId
    }
    return empty
  } catch {
    return empty
  }
}

function write(b: Blob): void {
  try { localStorage.setItem(KEY, JSON.stringify({ version: VERSION, users: { ...b.users } })) } catch { /* best effort */ }
}

export function readExamplePageId(userKey: string): string | null {
  return read().users[userKey] ?? null
}

export function writeExamplePageId(userKey: string, pageId: string): void {
  const b = read()
  b.users[userKey] = pageId
  write(b)
}

/** Forget the example page: a failed load leaves the user on a page of their
 *  own choosing, and a stale id would pause the tour off that page. */
export function clearExamplePageId(userKey: string): void {
  const b = read()
  if (!(userKey in b.users)) return
  delete b.users[userKey]
  write(b)
}
