// quodsim-react/src/adapters/modelRootWrites.ts
//
// Panel-wide flush points for the batched model-root sources (spec 2026-09-12
// lucid-model-root-batching §3). Every useModelRootSource() instance registers
// here; this module sends their pending writes when the panel loses focus
// (a click on the canvas, a page tab, Lucid's toolbar), when the window is
// hidden or unloaded, and -- through useSendMessage -- before a message whose
// host handler reads the stored model.
//
// One registry per JS realm: the panel and each modal iframe have their own.

export interface RegisteredModelRootSource {
  flush(): Promise<void>
  hasPendingWrites(): boolean
}

const sources = new Set<RegisteredModelRootSource>()
let listenersInstalled = false

function onLeave(): void {
  void flushAllModelRootWrites()
}

export function registerModelRootSource(source: RegisteredModelRootSource): () => void {
  sources.add(source)
  if (!listenersInstalled && typeof window !== 'undefined') {
    window.addEventListener('blur', onLeave)
    window.addEventListener('pagehide', onLeave)
    window.addEventListener('beforeunload', onLeave)
    listenersInstalled = true
  }
  return () => {
    sources.delete(source)
  }
}

export function hasPendingModelRootWrites(): boolean {
  for (const source of sources) {
    if (source.hasPendingWrites()) return true
  }
  return false
}

/**
 * Flush every registered source and wait for all of them. Never rejects: a
 * refused batch already shows the stored values through its corrective
 * snapshot, and the caller's own action should still go ahead.
 */
export function flushAllModelRootWrites(): Promise<void> {
  const flushes = Array.from(sources, (source) => source.flush().catch(() => {}))
  return Promise.all(flushes).then(() => undefined)
}

export function resetModelRootWritesForTests(): void {
  sources.clear()
  if (listenersInstalled && typeof window !== 'undefined') {
    window.removeEventListener('blur', onLeave)
    window.removeEventListener('pagehide', onLeave)
    window.removeEventListener('beforeunload', onLeave)
  }
  listenersInstalled = false
}
