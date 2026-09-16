// Test helper: a controllable stand-in for createLucidModalHost.
import { vi } from 'vitest'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

export interface Deferred<T> { promise: Promise<T>; resolve: (v: T) => void }
export function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

export type SyncResult = { modelId?: string; synced: boolean; error?: string }

/** Stand-in for requestModelSync's callback stream: `emit` delivers a result
 *  (the timeout or a reply, possibly more than once) to the live subscriber. */
export function syncStream() {
  let cb: ((r: SyncResult) => void) | null = null
  const unsubscribe = vi.fn(() => { cb = null })
  return {
    subscribe: (onResult: (r: SyncResult) => void) => { cb = onResult; return unsubscribe },
    emit: (r: SyncResult) => cb?.(r),
    unsubscribe,
  }
}

export function makeFakeHost(ports: { send: (type: EnvelopeMessageType, data?: unknown) => void }) {
  const token = deferred<string | undefined>()
  const sync = syncStream()
  return {
    token,
    sync,
    writer: undefined,
    connect: vi.fn(),
    disconnect: vi.fn(),
    requestCatalog: vi.fn(),
    onCatalog: vi.fn(() => () => {}),
    runScenario: vi.fn(),
    onRunResult: vi.fn(() => () => {}),
    locateElement: vi.fn(),
    closeModal: vi.fn(() => ports.send(EnvelopeMessageType.CLOSE_MODAL)),
    requestToken: vi.fn(() => token.promise),
    requestModelSync: vi.fn((onResult: (r: SyncResult) => void) => sync.subscribe(onResult)),
  }
}
export type FakeHost = ReturnType<typeof makeFakeHost>
