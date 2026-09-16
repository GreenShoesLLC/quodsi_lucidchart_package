import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryClientDefaultOptions } from 'quodsi_studio/lib/queryClientDefaults'
import type { LucidModalHost } from './lucidModalHost'
import { useLucidModalHost } from './useLucidModalHost'
import { useStudioApiSetup } from './useStudioApiSetup'
import { ModalHeader } from './ModalHeader'

// One lazy module: the consult and the focus parser both come from the heavy
// studies export, so neither lands in the panel's entry chunk.
const Consult = lazy(() =>
  import('quodsi_studio/platforms/studies').then((m) => ({
    default: ({ params, host }: { params: URLSearchParams; host: LucidModalHost }) => (
      <m.AdvisorConsultSurface focus={m.focusFromParams(params)} host={host} />
    ),
  })),
)

/** The Advisor modal: Studio's compiled consult surface, with a writer so its
 *  suggestions can be applied to the diagram through the extension. */
export function AdvisorModalView() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const apiBaseUrl = params.get('apiBaseUrl')
  const title = params.get('title') ?? 'Ask the Advisor'
  const host = useLucidModalHost({ withWriter: true })
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: queryClientDefaultOptions }))
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const getToken = useStudioApiSetup(apiBaseUrl, host)

  useEffect(() => {
    host.connect()
    let cancelled = false
    // Shares the api client's in-flight token request: one request per open.
    void getToken().then((t) => { if (!cancelled) setSignedIn(!!t) })
    return () => { cancelled = true; host.disconnect() }
  }, [host, getToken])

  return (
    <div className="h-full w-full flex flex-col bg-surface">
      <ModalHeader title={title} onClose={() => host.closeModal()} />
      <div className="flex-1 min-h-0">
        {!apiBaseUrl ? (
          <p role="alert" className="p-4 text-sm text-secondary">The Advisor isn&apos;t configured for this environment.</p>
        ) : signedIn === false ? (
          <p role="alert" className="p-4 text-sm text-secondary">Sign in to Quodsi in the Quodsi panel, then reopen the Advisor.</p>
        ) : (
          <QueryClientProvider client={queryClient}>
            <Suspense fallback={<p className="p-4 text-sm text-muted">Loading the Advisor…</p>}>
              <Consult params={params} host={host} />
            </Suspense>
          </QueryClientProvider>
        )}
      </div>
    </div>
  )
}
