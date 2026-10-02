import { useMemo } from 'react'
import { StatusPanel } from 'quodsi_studio/platforms/shared'

/**
 * The ?view=status Lucid modal (ClickUp 86e3f949t): quodsi_studio's shared
 * StatusPanel, compiled into this bundle. The extension's StatusModal puts the
 * API base URL on the URL (empty when this package has none -- the panel then
 * shows a clear "not configured" message). Lucid's native title bar carries
 * the title and the close X, so the panel's own heading is off.
 */
export function StatusModalView() {
  const apiBaseUrl = useMemo(() => new URLSearchParams(window.location.search).get('apiBaseUrl') ?? '', [])
  return (
    <div className="h-full w-full overflow-auto bg-surface p-4">
      <StatusPanel apiBaseUrl={apiBaseUrl} showTitle={false} buildLabel="Lucid extension build" />
    </div>
  )
}
