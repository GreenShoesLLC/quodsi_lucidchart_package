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

export function makeFakeHost(ports: { send: (type: EnvelopeMessageType, data?: unknown) => void }) {
  const token = deferred<string | undefined>()
  const sync = deferred<SyncResult>()
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
    requestModelSync: vi.fn(() => sync.promise),
  }
}
export type FakeHost = ReturnType<typeof makeFakeHost>
