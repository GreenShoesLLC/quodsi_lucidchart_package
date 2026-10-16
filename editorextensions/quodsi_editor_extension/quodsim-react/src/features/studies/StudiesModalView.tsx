import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryClientDefaultOptions } from 'quodsi_studio/lib/queryClientDefaults'
import type { EmbedSyncStatus, StudiesSurfaceProps, SurfaceScreen } from 'quodsi_studio/platforms/studies'
import type { LucidModalHost } from './lucidModalHost'
import { syncModelOnce } from './modelSync'
import { useLucidModalHost } from './useLucidModalHost'
import { useStudioApiSetup } from './useStudioApiSetup'
import { ModalHeader } from './ModalHeader'

// The surface with the Advisor Workspace's model and writer (spec 2026-10-16
// advisor-workspace): the hook lives in the same lazy chunk, so it is called here.
const StudiesSurface = lazy(() => import('quodsi_studio/platforms/studies').then((m) => {
  function SurfaceWithWorkspace({ host, syncModel, ...props }:
    StudiesSurfaceProps & { host: LucidModalHost; syncModel: () => Promise<void> }) {
    const { parts } = m.useLucidWorkspaceHost(host)
    const workspaceHost = useMemo(() => (parts ? { ...parts, syncModel } : undefined), [parts, syncModel])
    return <m.StudiesSurface {...props} workspaceHost={workspaceHost} />
  }
  return { default: SurfaceWithWorkspace }
}))

/** The Studies modal: Studio's compiled Studies surface, fed by the extension
 *  (token, model sync, scenarios) over this modal's messaging. */
export function StudiesModalView() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const apiBaseUrl = params.get('apiBaseUrl')
  const title = params.get('title') ?? 'What-if Analysis'
  const cachedModelId = params.get('modelId') || null
  // The Advisor's project strip opens Studies on its Project tab (spec 2026-10-16).
  const tab = params.get('tab') === 'project' ? 'project' : 'studies'

  // A writer, so the Workspace's model proposals can Apply from Studies too.
  const host = useLucidModalHost({ withWriter: true })
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: queryClientDefaultOptions }))
  const getToken = useStudioApiSetup(apiBaseUrl, host)

  const [screen, setScreen] = useState<SurfaceScreen | null>(cachedModelId ? { kind: tab, modelId: cachedModelId } : null)
  const [resetKey, setResetKey] = useState(0)
  const [syncStatus, setSyncStatus] = useState<EmbedSyncStatus>('pending')
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const scenariosSource = useMemo(() => ({ kind: 'lucid' as const, host }), [host])
  // After an Apply or before Check: a fresh sync, with the surface's run guard following it.
  const syncModel = useCallback(() => {
    setSyncStatus('pending')
    return syncModelOnce(host, {}, (r) => setSyncStatus(r.synced ? 'done' : 'failed'))
  }, [host])

  useEffect(() => {
    host.connect()
    let cancelled = false
    // Shares the api client's in-flight token request: one request per open.
    void getToken().then((t) => { if (!cancelled) setSignedIn(!!t) })
    // May report twice: a timeout (failed), then a late reply (done).
    const stopSync = host.requestModelSync((r) => {
      if (cancelled) return
      if (r.modelId && r.modelId !== cachedModelId) {
        setScreen({ kind: tab, modelId: r.modelId })
        setResetKey((k) => k + 1)
      }
      setSyncStatus(r.synced ? 'done' : 'failed')
    })
    return () => { cancelled = true; stopSync(); host.disconnect() }
  }, [host, getToken, cachedModelId, tab])

  return (
    <div className="h-full w-full flex flex-col bg-surface">
      <ModalHeader title={title} onClose={() => host.closeModal()} />
      <div className="flex-1 min-h-0">
        {!apiBaseUrl ? (
          <p role="alert" className="p-4 text-sm text-secondary">What-if Analysis isn&apos;t configured for this environment.</p>
        ) : signedIn === false ? (
          <p role="alert" className="p-4 text-sm text-secondary">Sign in to Quodsi in the Quodsi panel, then reopen Studies.</p>
        ) : (
          <QueryClientProvider client={queryClient}>
            <Suspense fallback={<p className="p-4 text-sm text-muted">Loading Studies…</p>}>
              <StudiesSurface host={host} syncModel={syncModel} initialScreen={screen} resetKey={resetKey} syncStatus={syncStatus} scenariosSource={scenariosSource} door="lucid" />
            </Suspense>
          </QueryClientProvider>
        )}
      </div>
    </div>
  )
}
