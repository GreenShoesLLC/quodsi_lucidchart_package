import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryClientDefaultOptions } from 'quodsi_studio/lib/queryClientDefaults'
import type { EmbedSyncStatus, SurfaceScreen } from 'quodsi_studio/platforms/studies'
import { useLucidModalHost } from './useLucidModalHost'
import { useStudioApiSetup } from './useStudioApiSetup'
import { ModalHeader } from './ModalHeader'

const StudiesSurface = lazy(() => import('quodsi_studio/platforms/studies').then((m) => ({ default: m.StudiesSurface })))

/** The Studies modal: Studio's compiled Studies surface, fed by the extension
 *  (token, model sync, scenarios) over this modal's messaging. */
export function StudiesModalView() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const apiBaseUrl = params.get('apiBaseUrl')
  const title = params.get('title') ?? 'Studies'
  const cachedModelId = params.get('modelId') || null

  const host = useLucidModalHost()
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: queryClientDefaultOptions }))
  const getToken = useStudioApiSetup(apiBaseUrl, host)

  const [screen, setScreen] = useState<SurfaceScreen | null>(cachedModelId ? { kind: 'studies', modelId: cachedModelId } : null)
  const [resetKey, setResetKey] = useState(0)
  const [syncStatus, setSyncStatus] = useState<EmbedSyncStatus>('pending')
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const scenariosSource = useMemo(() => ({ kind: 'lucid' as const, host }), [host])

  useEffect(() => {
    host.connect()
    let cancelled = false
    // Shares the api client's in-flight token request: one request per open.
    void getToken().then((t) => { if (!cancelled) setSignedIn(!!t) })
    // May report twice: a timeout (failed), then a late reply (done).
    const stopSync = host.requestModelSync((r) => {
      if (cancelled) return
      if (r.modelId && r.modelId !== cachedModelId) {
        setScreen({ kind: 'studies', modelId: r.modelId })
        setResetKey((k) => k + 1)
      }
      setSyncStatus(r.synced ? 'done' : 'failed')
    })
    return () => { cancelled = true; stopSync(); host.disconnect() }
  }, [host, getToken, cachedModelId])

  return (
    <div className="h-full w-full flex flex-col bg-surface">
      <ModalHeader title={title} onClose={() => host.closeModal()} />
      <div className="flex-1 min-h-0">
        {!apiBaseUrl ? (
          <p role="alert" className="p-4 text-sm text-secondary">Studies isn&apos;t configured for this environment.</p>
        ) : signedIn === false ? (
          <p role="alert" className="p-4 text-sm text-secondary">Sign in to Quodsi in the Quodsi panel, then reopen Studies.</p>
        ) : (
          <QueryClientProvider client={queryClient}>
            <Suspense fallback={<p className="p-4 text-sm text-muted">Loading Studies…</p>}>
              <StudiesSurface initialScreen={screen} resetKey={resetKey} syncStatus={syncStatus} scenariosSource={scenariosSource} />
            </Suspense>
          </QueryClientProvider>
        )}
      </div>
    </div>
  )
}
